const { v4: uuidv4 } = require('uuid');
const Mutex = require('./mutex');
const {
  AlreadyObtainedError,
  TableLockedError,
  LockTimeoutError
} = require('./error');

const DEFAULT_LOCK_TABLE_NAME = 'distributed_lock';
const DEFAULT_LOCK_TIMEOUT_SEC = 300;
const DEFAULT_SLEEP_MSEC = 1000;

const defaultParams = {
  lockTableName: DEFAULT_LOCK_TABLE_NAME,
  lockTTLSeconds: 1200
};

class DistributedLock {
  constructor(lockName, params) {
    this.nodeId = uuidv4();
    this.lockName = lockName;
    const { queryInterface, lockTableName, lockTTLSeconds } = {
      ...defaultParams,
      ...params
    };

    if (!queryInterface) {
      throw new Error('Query interface required');
    }

    this.mutex = new Mutex(queryInterface, lockTableName, lockTTLSeconds);
    console.debug(`[${this.nodeId}]: Initialized instance of distributed lock`);
  }

  async lock(
    execute = () => Promise.resolve(),
    params = {}
  ) {
    const {
      timeoutSeconds = DEFAULT_LOCK_TIMEOUT_SEC,
      sleepMiliseconds = DEFAULT_SLEEP_MSEC
    } = params;

    await this.mutex.initializeLockTable();
    const until = Date.now() + timeoutSeconds * 1000;
    while (true) {
      try {
        console.debug(
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

        console.debug(`[${this.nodeId}]: Unable to obtain lock: ${e.message}`);
        await (new Promise((resolve) => setTimeout(resolve, sleepMiliseconds)));
        if (Date.now() >= until) {
          throw new LockTimeoutError(this.lockName, timeoutSeconds);
        }
      }
    }

    console.debug(
      `[${this.nodeId}]: Successfully obtained lock ${this.lockName}`
    );
    try {
      return await execute();
    } finally {
      console.debug(`[${this.nodeId}]: Releasing lock ${this.lockName}`);
      await this.mutex.releaseLock(this.lockName, this.nodeId);
      console.debug(
        `[${this.nodeId}]: Successfully released lock ${this.lockName}`
      );
    }
  }
}

module.exports = DistributedLock;
