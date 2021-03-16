const getLockInterface = require('./lock-interface');
const {
  AlreadyObtainedError,
  TableLockedError
} = require('./error');

class Mutex {
  constructor(queryInterface, lockTableName, lockTTLSeconds) {
    this.queryInterface = queryInterface;
    this.lockTableName = lockTableName;
    this.lockTTLSeconds = lockTTLSeconds;
    this.lockInterface = getLockInterface(queryInterface.sequelize.dialect.name);
  }

  async initializeLockTable() {
    try {
      await this.useTransaction(async (transaction) =>
        this.queryInterface.sequelize.query(
          this.lockInterface.createLockTable(this.lockTableName),
          { transaction }
        ));
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        // ignore
      }
    }
  }

  async obtainLock(lockName, nodeId) {
    const { node_id: ownerId } = await this.withLock(async (transaction) =>
      this.queryInterface.sequelize.query(this.lockInterface.obtainMutex(this.lockTableName), {
        replacements: {
          mutex: lockName,
          nodeId
        },
        transaction,
        plain: true
      }));

    if (ownerId !== nodeId) {
      throw new AlreadyObtainedError(lockName, ownerId);
    }
  }

  async releaseLock(lockName, nodeId) {
    await this.withLock(
      async (transaction) =>
        this.queryInterface.sequelize.query(this.lockInterface.removeMutex(this.lockTableName), {
          replacements: {
            mutex: lockName,
            nodeId
          },
          transaction,
          plain: true
        }),
      true
    );
  }

  async withLock(callback, wait = false) {
    return this.useTransaction(async (transaction) => {
      try {
        await this.queryInterface.sequelize.query(
          this.lockInterface.lockTable(this.lockTableName, wait),
          { transaction }
        );

        await this.queryInterface.sequelize.query(
          this.lockInterface.removeStaleLocks(this.lockTableName, this.lockTTLSeconds),
          { transaction }
        );

        return callback(transaction);
      } catch (e) {
        if (
          e.name === 'SequelizeDatabaseError'
          && e.message.indexOf('could not obtain lock') > -1
        ) {
          throw new TableLockedError(this.lockTableName);
        }

        throw e;
      }
    });
  }

  async useTransaction(callback) {
    const transaction = await this.queryInterface.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' });
    try {
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}

module.exports = Mutex;
