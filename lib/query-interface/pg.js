const { Pool } = require('pg');
const QueryInterface = require('./base');
const { convertNamedToPositional } = require('../utils/query');

class PGTransaction {
  constructor(client) {
    this.client = client;
  }

  async create() {
    await this.client.query('BEGIN');
    return this;
  }

  async commit() {
    await this.client.query('COMMIT');
    this.release();
    return this;
  }

  async rollback() {
    await this.client.query('ROLLBACK');
    this.release();
    return this;
  }

  release() {
    this.client.release();
  }
}

class PGQueryInterface extends QueryInterface {
  async query(statement, { transaction, replacements, firstResult }) {
    const { query, positionalArguments } = convertNamedToPositional(statement, replacements);
    const result = await transaction.client.query(query, positionalArguments);
    return firstResult ? result.rows[0] : result.rows;
  }

  async createTransaction() {
    const client = await this.queryInterface.connect();
    const transaction = new PGTransaction(client);
    return transaction.create();
  }

  getDialectName() {
    return 'postgres';
  }

  parseDatabaseError(error) {
    if (error.message.indexOf('duplicate key value violates unique constraint') > -1 || error.message.indexOf('already exists') > -1) {
      return QueryInterface.DatabaseErrors.UniqueConstraintError;
    }

    if (error.message.indexOf('could not obtain lock on relation') > -1) {
      return QueryInterface.DatabaseErrors.TableLockedError;
    }

    console.error(error);
    return QueryInterface.DatabaseErrors.UnknownError;
  }
}

PGQueryInterface.interfaceName = 'pg';
PGQueryInterface.checkInterface = (queryInterface) => queryInterface instanceof Pool;

module.exports = PGQueryInterface;
