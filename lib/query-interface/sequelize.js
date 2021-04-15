const QueryInterface = require('./base');

class SequelizeQueryInterface extends QueryInterface {
  async query(statement, { transaction, replacements }) {
    return this.queryInterface.sequelize.query(statement, {
      replacements,
      transaction,
      plain: true
    });
  }

  async createTransaction() {
    return this.queryInterface.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' });
  }

  async commitTransaction(transaction) {
    return transaction.commit();
  }

  async rollbackTransaction(transaction) {
    return transaction.rollback();
  }

  getDialectName() {
    return this.queryInterface.sequelize.dialect.name;
  }

  parseDatabaseError(error) {
    if (
      error.name === 'SequelizeDatabaseError'
      && error.message.indexOf('could not obtain lock') > -1
    ) {
      return QueryInterface.DatabaseErrors.TableLockedError;
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return QueryInterface.DatabaseErrors.UniqueConstraintError;
    }

    return QueryInterface.DatabaseErrors.UnknownError;
  }
}

SequelizeQueryInterface.interfaceName = 'sequelize';

module.exports = SequelizeQueryInterface;
