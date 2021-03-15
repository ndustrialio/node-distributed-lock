const { when } = require('jest-when');
const Mutex = require('../mutex');
const getLockInterface = require('../lock-interface');
const LockInterface = require('../lock-interface/base');
const { TableLockedError, AlreadyObtainedError } = require('../error');

jest.mock('../lock-interface');

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

describe('Mutex', () => {
  let queryInterface;
  let lockInterfaceMocks;
  let transaction;
  let mutex;
  let query;

  beforeEach(() => {
    lockInterfaceMocks = {
      lockTable: jest.fn(),
      removeStaleLocks: jest.fn(),
      createLockTable: jest.fn(),
      obtainMutex: jest.fn(),
      removeMutex: jest.fn()
    };
    const lockInterface = new TestLock(lockInterfaceMocks);
    getLockInterface.mockClear();
    getLockInterface.mockReturnValue(lockInterface);
    query = jest.fn().mockResolvedValue('');
    transaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    queryInterface = {
      sequelize: {
        dialect: { name: 'test' },
        query,
        async transaction() {
          return transaction;
        }
      }
    };
    mutex = new Mutex(queryInterface, lockTableName, lockTTLSeconds);
  });

  describe('useTransaction', () => {
    test('returns the result of the callback on success', async () => {
      const callback = jest.fn();
      callback.mockResolvedValue('test');
      const result = await mutex.useTransaction(callback);
      expect(result).toBe('test');
      expect(transaction.commit).toBeCalledTimes(1);
    });

    test('throws an error and rolls back on callback failure', async () => {
      const callback = jest.fn();
      callback.mockRejectedValue(new Error('Async error'));
      await expect(mutex.useTransaction(callback)).rejects.toThrow('error');
      expect(transaction.rollback).toBeCalledTimes(1);
    });
  });

  describe('withLock', () => {
    test('returns the result of the callback on success lock', async () => {
      const callback = jest.fn();
      callback.mockResolvedValue('test');
      const result = await mutex.withLock(callback);
      expect(result).toBe('test');
      expect(lockInterfaceMocks.lockTable).toHaveBeenCalledWith(lockTableName, false);
      expect(lockInterfaceMocks.removeStaleLocks).toHaveBeenCalledWith(lockTableName, lockTTLSeconds);
      expect(transaction.commit).toBeCalledTimes(1);
    });

    test('throws an error and rolls back on callback failure', async () => {
      const callback = jest.fn();
      callback.mockRejectedValue(new Error('Async error'));
      await expect(mutex.withLock(callback)).rejects.toThrow('error');
      expect(lockInterfaceMocks.lockTable).toHaveBeenCalledWith(lockTableName, false);
      expect(lockInterfaceMocks.removeStaleLocks).toHaveBeenCalledWith(lockTableName, lockTTLSeconds);
      expect(transaction.rollback).toBeCalledTimes(1);
    });

    test('throws a TableLockedError if the table is locked', async () => {
      const callback = jest.fn();
      callback.mockResolvedValue('test');

      const error = new Error();
      error.name = 'SequelizeDatabaseError';
      error.message = 'could not obtain lock';

      query.mockRejectedValue(error);

      try {
        expect.assertions(2);
        await mutex.withLock(callback);
      } catch (e) {
        expect(e).toBeInstanceOf(TableLockedError);
      }

      expect(transaction.rollback).toBeCalledTimes(1);
    });
  });

  describe('initializeLockTable', () => {
    test('calls the correct interface method', async () => {
      await mutex.initializeLockTable();
      expect(transaction.commit).toBeCalledTimes(1);
    });
  });

  describe('obtainLock', () => {
    test('throws an AlreadyObtainedError if the ownerId does not match', async () => {
      const lockName = 'testLock';
      const nodeId = '1234';

      lockInterfaceMocks.obtainMutex.mockReturnValue('obtainMutex');
      when(query).calledWith('obtainMutex', expect.anything()).mockResolvedValueOnce({ node_id: '4567' });
      try {
        expect.assertions(2);
        await mutex.obtainLock(lockName, nodeId);
      } catch (e) {
        expect(e).toBeInstanceOf(AlreadyObtainedError);
      }

      expect(transaction.commit).toBeCalledTimes(1);
    });

    test('Does not throw anything when the lock is obtained', async () => {
      const lockName = 'testLock';
      const nodeId = '1234';

      lockInterfaceMocks.obtainMutex.mockReturnValue('obtainMutex');
      when(query).calledWith('obtainMutex', expect.anything()).mockResolvedValueOnce({ node_id: nodeId });
      await mutex.obtainLock(lockName, nodeId);
      expect(transaction.commit).toBeCalledTimes(1);
    });
  });

  describe('releaseLock', () => {
    it('calls the correct interface method', async () => {
      await mutex.releaseLock();
      expect(lockInterfaceMocks.removeMutex).toBeCalledTimes(1);
      expect(transaction.commit).toBeCalledTimes(1);
    });
  });
});
