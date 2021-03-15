const DistributedLock = require('../distributed-lock');
const { AlreadyObtainedError, LockTimeoutError } = require('../error');
const Mutex = require('../mutex');

jest.mock('../mutex');

describe('DistributedLock', () => {
  beforeEach(() => {
    Mutex.mockClear();
  });

  describe('constructor', () => {
    test('throws an error if queryInterface is not defined', async () => {
      expect(() => new DistributedLock('test', {})).toThrow('Query interface required');
    });

    test('constructs with default parameters', () => {
      const lock = new DistributedLock('test', { queryInterface: jest.fn() });
      expect(lock.nodeId).toBeDefined();
      expect(lock.lockName).toEqual('test');
      expect(lock.mutex).toBeDefined();
      expect(Mutex.mock.instances[0].constructor.mock.calls[0][1]).toEqual('distributed_lock');
      expect(Mutex.mock.instances[0].constructor.mock.calls[0][2]).toEqual(1200);
    });

    test('constructs with custom parameters', () => {
      const lock = new DistributedLock('test', {
        queryInterface: jest.fn(),
        lockTableName: 'random',
        lockTTLSeconds: 1000
      });
      expect(lock.nodeId).toBeDefined();
      expect(lock.lockName).toEqual('test');
      expect(lock.mutex).toBeDefined();
      expect(Mutex.mock.instances[0].constructor.mock.calls[0][1]).toEqual('random');
      expect(Mutex.mock.instances[0].constructor.mock.calls[0][2]).toEqual(1000);
    });
  });

  describe('lock', () => {
    test('exits obtain loop if any unknown error is thrown', async () => {
      const logic = jest.fn();
      const lock = new DistributedLock('test', { queryInterface: jest.fn() });
      lock.mutex.initializeLockTable.mockResolvedValue();
      lock.mutex.obtainLock.mockRejectedValue(new Error('Async error'));
      await expect(lock.lock(logic, 1)).rejects.toThrow('Async error');
    });

    test('throws an LockTimeoutError if unable to obtain lock in time period', async () => {
      const logic = jest.fn();
      const lock = new DistributedLock('test', { queryInterface: jest.fn() });
      lock.mutex.initializeLockTable.mockResolvedValue();
      lock.mutex.obtainLock.mockRejectedValue(new AlreadyObtainedError());

      try {
        expect.assertions(1);
        await lock.lock(logic, 1);
      } catch (e) {
        expect(e).toBeInstanceOf(LockTimeoutError);
      }
    });

    test('Calls obtainLock multiple times until succeeded within timeout', async () => {
      const logic = jest.fn();
      const lock = new DistributedLock('test', { queryInterface: jest.fn() });
      lock.mutex.initializeLockTable.mockResolvedValue();
      lock.mutex.releaseLock.mockResolvedValue();
      lock.mutex.obtainLock
        .mockRejectedValueOnce(new AlreadyObtainedError())
        .mockRejectedValueOnce(new AlreadyObtainedError())
        .mockResolvedValue();

      await lock.lock(logic, 3);
      expect(lock.mutex.obtainLock).toBeCalledTimes(3);
      expect(lock.mutex.releaseLock).toBeCalledTimes(1);
      expect(logic).toBeCalled();
    });
  });
});
