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

  async query(statement, { transaction, replacements, firstResult }) { // eslint-disable-line
    throw new NotImplementedError();
  }

  async createTransaction() {
    throw new NotImplementedError();
  }

  async commitTransaction(transaction) {
    return transaction.commit();
  }

  async rollbackTransaction(transaction) {
    return transaction.rollback();
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
