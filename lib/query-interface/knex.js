const QueryInterface = require('./base');

class KnexQueryInterface extends QueryInterface {
  async query(statement, { transaction, replacements, firstResult }) {
    const result = await this.queryInterface.raw(statement, replacements).transacting(transaction);
    return firstResult ? result.rows[0] : result.rows;
  }

  async createTransaction() {
    return this.queryInterface.transaction();
  }

  getDialectName() {
    const { client } = this.queryInterface.connection().client.config;
    switch (client) {
      case 'pg':
        return 'postgres';
      default:
        return client;
    }
  }

  parseDatabaseError(error) {
    if (
      error.message && error.message.indexOf('could not obtain lock') > -1
    ) {
      return QueryInterface.DatabaseErrors.TableLockedError;
    }

    if (error.message && (error.message.indexOf('duplicate key value violates unique constraint') > -1 || error.message.indexOf('already exists') > -1)) {
      return QueryInterface.DatabaseErrors.UniqueConstraintError;
    }

    return QueryInterface.DatabaseErrors.UnknownError;
  }
}

KnexQueryInterface.interfaceName = 'knex';
KnexQueryInterface.checkInterface = (queryInterface) => Object.prototype.hasOwnProperty.call(queryInterface, 'name') && queryInterface.name === 'knex';

module.exports = KnexQueryInterface;
