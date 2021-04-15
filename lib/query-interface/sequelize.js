const QueryInterface = require('./base');

class SequelizeQueryInterface extends QueryInterface {
  async query(statement, { transaction, replacements, firstResult }) {
    return this.queryInterface.sequelize.query(statement, {
      replacements,
      transaction,
      plain: firstResult === true
    });
  }

  async createTransaction() {
    return this.queryInterface.sequelize.transaction({ isolationLevel: 'SERIALIZABLE' });
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

    if (error.name === 'SequelizeUniqueConstraintError' || error.message.indexOf('already exists') > -1) {
      return QueryInterface.DatabaseErrors.UniqueConstraintError;
    }

    return QueryInterface.DatabaseErrors.UnknownError;
  }
}

SequelizeQueryInterface.interfaceName = 'sequelize';
SequelizeQueryInterface.checkInterface = (queryInterface) => Object.prototype.hasOwnProperty.call(queryInterface, 'sequelize');

module.exports = SequelizeQueryInterface;
