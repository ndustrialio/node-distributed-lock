const getLockInterface = require('./lock-interface');
const {
  AlreadyObtainedError,
  TableLockedError
} = require('./error');
const getQueryInterface = require('./query-interface');
const QueryInterface = require('./query-interface/base');

class Mutex {
  constructor(options) {
    const { queryInterface, lockTableName, lockTTLSeconds, queryInterfaceName } = options;
    this.lockTableName = lockTableName;
    this.lockTTLSeconds = lockTTLSeconds;
    this.queryInterface = getQueryInterface({ queryInterface, queryInterfaceName });
    this.lockInterface = getLockInterface(this.queryInterface.getDialectName());
  }

  async initializeLockTable() {
    try {
      await this.queryInterface.useTransaction(async (transaction) =>
        this.queryInterface.query(
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
      this.queryInterface.query(this.lockInterface.obtainMutex(this.lockTableName), {
        replacements: {
          mutex: lockName,
          nodeId
        },
        transaction
      }));

    if (ownerId !== nodeId) {
      throw new AlreadyObtainedError(lockName, ownerId);
    }
  }

  async releaseLock(lockName, nodeId) {
    await this.withLock(
      async (transaction) =>
        this.queryInterface.query(this.lockInterface.removeMutex(this.lockTableName), {
          replacements: {
            mutex: lockName,
            nodeId
          },
          transaction
        }),
      true
    );
  }

  async withLock(callback, wait = false) {
    return this.queryInterface.useTransaction(async (transaction) => {
      try {
        await this.queryInterface.query(
          this.lockInterface.lockTable(this.lockTableName, wait),
          { transaction }
        );

        await this.queryInterface.query(
          this.lockInterface.removeStaleLocks(this.lockTableName, this.lockTTLSeconds),
          { transaction }
        );

        return callback(transaction);
      } catch (e) {
        switch (this.queryInterface.parseDatabaseError(e)) {
          case QueryInterface.DatabaseErrors.TableLockedError:
            throw new TableLockedError(this.lockTableName);
          default:
            throw e;
        }
      }
    });
  }
}

module.exports = Mutex;
