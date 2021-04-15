const { when } = require('jest-when');
const Mutex = require('../mutex');
const getLockInterface = require('../lock-interface');
const getQueryInterface = require('../query-interface');
const LockInterface = require('../lock-interface/base');
const QueryInterface = require('../query-interface/base');
const { TableLockedError, AlreadyObtainedError } = require('../error');

jest.mock('../lock-interface');
jest.mock('../query-interface');

const lockTableName = 'test';
const lockTTLSeconds = 10;

class TestLock extends LockInterface {
  constructor(mocks) {
    super();
    this.setMocks(mocks);
  }

  setMocks(mocks) {
    this.mocks = { ...(this.mocks || {}), ...mocks };
  }

  createLockTable(...args) {
    return this.mocks.createLockTable(...args);
  }

  removeStaleLocks(...args) {
    return this.mocks.removeStaleLocks(...args);
  }

  lockTable(...args) {
    return this.mocks.lockTable(...args);
  }

  obtainMutex(...args) {
    return this.mocks.obtainMutex(...args);
  }

  removeMutex(...args) {
    return this.mocks.removeMutex(...args);
  }
}

class TestQueryInterface extends QueryInterface {
  constructor(mocks) {
    super();
    this.setMocks(mocks);
  }

  setMocks(mocks) {
    this.mocks = { ...(this.mocks || {}), ...mocks };
  }

  async query(...args) {
    return this.mocks.query(...args);
  }

  async createTransaction() {
    return this.mocks.createTransaction();
  }

  async commitTransaction(...args) {
    return this.mocks.commitTransaction(...args);
  }

  async rollbackTransaction(...args) {
    return this.mocks.rollbackTransaction(...args);
  }

  parseDatabaseError(...args) {
    return this.mocks.parseDatabaseError(...args);
  }

  getDialectName() {
    return 'none';
  }
}

describe('Mutex', () => {
  let lockInterfaceMocks;
  let queryInterfaceMocks;
  let transaction;
  let mutex;
  let query;

  beforeEach(() => {
    lockInterfaceMocks = {
      lockTable: jest.fn(() => 'lockTable'),
      removeStaleLocks: jest.fn(() => 'removeStaleLocks'),
      createLockTable: jest.fn(() => 'createLockTable'),
      obtainMutex: jest.fn(() => 'obtainMutex'),
      removeMutex: jest.fn(() => 'removeMutex'),
    };
    const lockInterface = new TestLock(lockInterfaceMocks);
    getLockInterface.mockClear();
    getLockInterface.mockReturnValue(lockInterface);

    transaction = {};
    queryInterfaceMocks = {
      query: jest.fn().mockResolvedValue(''),
      createTransaction: jest.fn(async () => transaction),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      parseDatabaseError: jest.fn()
    };
    const queryInterface = new TestQueryInterface(queryInterfaceMocks);
    getQueryInterface.mockClear();
    getQueryInterface.mockReturnValue(queryInterface);
    mutex = new Mutex({ queryInterface, lockTableName, lockTTLSeconds });
  });

  // describe('useTransaction', () => {
  //   test('returns the result of the callback on success', async () => {
  //     const callback = jest.fn();
  //     callback.mockResolvedValue('test');
  //     const result = await mutex.useTransaction(callback);
  //     expect(result).toBe('test');
  //     expect(transaction.commit).toBeCalledTimes(1);
  //   });

  //   test('throws an error and rolls back on callback failure', async () => {
  //     const callback = jest.fn();
  //     callback.mockRejectedValue(new Error('Async error'));
  //     await expect(mutex.useTransaction(callback)).rejects.toThrow('error');
  //     expect(transaction.rollback).toBeCalledTimes(1);
  //   });
  // });

  describe('withLock', () => {
    test('returns the result of the callback on success lock', async () => {
      const callback = jest.fn();
      callback.mockResolvedValue('test');
      const result = await mutex.withLock(callback);
      expect(result).toBe('test');
      expect(queryInterfaceMocks.createTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(0);
      expect(queryInterfaceMocks.query).toHaveBeenCalledWith('lockTable', { transaction });
      expect(queryInterfaceMocks.query).toHaveBeenCalledWith('removeStaleLocks', { transaction });
      expect(lockInterfaceMocks.lockTable).toHaveBeenCalledWith(lockTableName, false);
      expect(lockInterfaceMocks.removeStaleLocks).toHaveBeenCalledWith(lockTableName, lockTTLSeconds);
    });

    test('throws an error and rolls back on callback failure', async () => {
      const callback = jest.fn();
      callback.mockRejectedValue(new Error('Async error'));
      await expect(mutex.withLock(callback)).rejects.toThrow('error');
      expect(queryInterfaceMocks.createTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(0);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(lockInterfaceMocks.lockTable).toHaveBeenCalledWith(lockTableName, false);
      expect(lockInterfaceMocks.removeStaleLocks).toHaveBeenCalledWith(lockTableName, lockTTLSeconds);
    });

    test('throws a TableLockedError if the table is locked', async () => {
      const callback = jest.fn();
      callback.mockResolvedValue('test');
      queryInterfaceMocks.parseDatabaseError.mockReturnValue(QueryInterface.DatabaseErrors.TableLockedError);
      queryInterfaceMocks.query.mockRejectedValue(new Error());

      try {
        expect.assertions(3);
        await mutex.withLock(callback);
      } catch (e) {
        expect(e).toBeInstanceOf(TableLockedError);
      }

      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(0);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeLockTable', () => {
    test('calls the correct interface method', async () => {
      await mutex.initializeLockTable();
      expect(lockInterfaceMocks.createLockTable).toHaveBeenCalledWith(lockTableName);
      expect(queryInterfaceMocks.createTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(0);
    });
  });

  describe('obtainLock', () => {
    test('throws an AlreadyObtainedError if the ownerId does not match', async () => {
      const lockName = 'testLock';
      const nodeId = '1234';

      lockInterfaceMocks.obtainMutex.mockReturnValue('obtainMutex');
      when(queryInterfaceMocks.query).calledWith('obtainMutex', expect.anything()).mockResolvedValueOnce({ node_id: '4567' });
      try {
        expect.assertions(3);
        await mutex.obtainLock(lockName, nodeId);
      } catch (e) {
        expect(e).toBeInstanceOf(AlreadyObtainedError);
      }

      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(0);
    });

    test('Does not throw anything when the lock is obtained', async () => {
      const lockName = 'testLock';
      const nodeId = '1234';

      lockInterfaceMocks.obtainMutex.mockReturnValue('obtainMutex');
      when(queryInterfaceMocks.query).calledWith('obtainMutex', expect.anything()).mockResolvedValueOnce({ node_id: nodeId });
      await mutex.obtainLock(lockName, nodeId);
      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(0);
    });
  });

  describe('releaseLock', () => {
    it('calls the correct interface method', async () => {
      await mutex.releaseLock();
      expect(lockInterfaceMocks.removeMutex).toBeCalledTimes(1);
      expect(queryInterfaceMocks.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryInterfaceMocks.rollbackTransaction).toHaveBeenCalledTimes(0);
    });
  });
});
