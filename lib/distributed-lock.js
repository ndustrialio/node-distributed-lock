const { v4: uuidv4 } = require('uuid');
const exitHook = require('async-exit-hook');
const { callbackify } = require('util');
const Mutex = require('./mutex');
const {
  AlreadyObtainedError,
  TableLockedError,
  LockTimeoutError
} = require('./error');
const log = require('./utils/log');

const DEFAULT_LOCK_TABLE_NAME = 'distributed_lock';
const DEFAULT_LOCK_TIMEOUT_SEC = 300;
const DEFAULT_SLEEP_MSEC = 1000;

const defaultParams = {
  lockTableName: DEFAULT_LOCK_TABLE_NAME,
  lockTTLSeconds: 1200,
  skipIfObtained: false
};

const currentLocks = {};

const onExit = callbackify(async () => {
  log('Cleaning up any held locks...');
  // eslint-disable-next-line no-restricted-syntax
  for (const currentLock of Object.values(currentLocks)) {
    const { mutex, lockName, nodeId } = currentLock;
    log(`[${nodeId}]: Releasing lock ${lockName}`);
    try {
      await mutex.releaseLock(lockName, nodeId);
      delete currentLock[nodeId];
      log(
        `[${nodeId}]: Successfully released lock ${this.lockName}`
      );
    } catch (e) {
      console.error(`Unable to release lock. ${e.message}`);
    }
  }
});

// Attempt to release any held locks if we are accidentally killed
exitHook(onExit);

class DistributedLock {
  constructor(lockName, params) {
    this.nodeId = uuidv4();
    this.lockName = lockName;
    const { queryInterface, lockTableName, lockTTLSeconds, skipIfObtained, queryInterfaceName } = {
      ...defaultParams,
      ...params
    };
    this.skipIfObtained = skipIfObtained;

    if (!queryInterface) {
      throw new Error('Query interface required');
    }

    this.mutex = new Mutex({ queryInterface, lockTableName, lockTTLSeconds, queryInterfaceName });
    log(`[${this.nodeId}]: Initialized instance of distributed lock`);
  }

  async lock(
    execute = () => Promise.resolve(),
    params = {}
  ) {
    const {
      timeoutSeconds = DEFAULT_LOCK_TIMEOUT_SEC,
      sleepMilliseconds = DEFAULT_SLEEP_MSEC
    } = params;

    await this.mutex.initializeLockTable();
    const until = Date.now() + timeoutSeconds * 1000;
    while (true) {
      try {
        log(
          `[${this.nodeId}]: Attempting to obtain lock ${this.lockName}`
        );
        await this.mutex.obtainLock(this.lockName, this.nodeId);
        break;
      } catch (e) {
        if (
          !(e instanceof AlreadyObtainedError || e instanceof TableLockedError)
        ) {
          throw e;
        }

        if (e instanceof AlreadyObtainedError && this.skipIfObtained) {
          log(`[${this.nodeId}]: Lock has been obtained. Exiting...`);
          return DistributedLock.EXECUTION_SKIPPED;
        }

        log(`[${this.nodeId}]: Unable to obtain lock: ${e.message}`);
        // eslint-disable-next-line no-promise-executor-return
        await (new Promise((resolve) => setTimeout(resolve, sleepMilliseconds)));
        if (Date.now() >= until) {
          throw new LockTimeoutError(this.lockName, timeoutSeconds);
        }
      }
    }

    log(
      `[${this.nodeId}]: Successfully obtained lock ${this.lockName}`
    );
    currentLocks[this.nodeId] = this;
    try {
      return await execute();
    } finally {
      log(`[${this.nodeId}]: Releasing lock ${this.lockName}`);
      await this.mutex.releaseLock(this.lockName, this.nodeId);
      delete currentLocks[this.nodeId];
      log(
        `[${this.nodeId}]: Successfully released lock ${this.lockName}`
      );
    }
  }
}

DistributedLock.EXECUTION_SKIPPED = Symbol('ExecutionSkipped');

module.exports = DistributedLock;
