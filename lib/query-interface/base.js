const { NotImplementedError } = require('../error');

class QueryInterface {
  constructor(queryInterfaceImpl) {
    this.queryInterface = queryInterfaceImpl;
  }

  async useTransaction(callback) {
    const transaction = await this.createTransaction();
    try {
      const result = await callback(transaction);
      await this.commitTransaction(transaction);
      return result;
    } catch (e) {
      await this.rollbackTransaction(transaction);
      throw e;
    }
  }

  handleError(error) {
    let knownError;
    try {
      knownError = this.parseDatabaseError(error);
    } catch (e) {
      // ignore
    }

    return knownError || QueryInterface.DatabaseErrors.UnknownError;
  }

  async query(statement, { transaction, replacements }) { // eslint-disable-line
    throw new NotImplementedError();
  }

  async createTransaction() {
    throw new NotImplementedError();
  }

  async commitTransaction(transaction) { // eslint-disable-line
    throw new NotImplementedError();
  }

  async rollbackTransaction(transaction) { // eslint-disable-line
    throw new NotImplementedError();
  }

  getDialectName() {
    throw new NotImplementedError();
  }

  parseDatabaseError(error) { // eslint-disable-line
    throw new NotImplementedError();
  }
}

QueryInterface.DatabaseErrors = {
  TableLockedError: 'TableLockedError',
  UniqueConstraintError: 'UniqueConstraintError',
  UnknownError: 'UnknownError'
};

module.exports = QueryInterface;
