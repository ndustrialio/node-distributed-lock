const { NotImplementedError } = require('../error');

class LockInterface {
  createSchema(schema) { // eslint-disable-line
    throw new NotImplementedError();
  }

  createLockTable(tableName) { // eslint-disable-line
    throw new NotImplementedError();
  }

  removeStaleLocks(tableName, lockTTLSeconds) { // eslint-disable-line
    throw new NotImplementedError();
  }

  lockTable(tableName, wait = false) { // eslint-disable-line
    throw new NotImplementedError();
  }

  obtainMutex(tableName) { // eslint-disable-line
    throw new NotImplementedError();
  }

  removeMutex(tableName) { // eslint-disable-line
    throw new NotImplementedError();
  }
}

LockInterface.dialect = 'N/A';

module.exports = LockInterface;
