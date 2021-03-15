class AlreadyObtainedError extends Error {
  constructor(mutex, ownerId) {
    super(`The lock ${mutex} is being held by the node ${ownerId}`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class TableLockedError extends Error {
  constructor(tableName) {
    super(`The table ${tableName} is currently locked.`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class LockTimeoutError extends Error {
  constructor(mutex, timeoutSeconds) {
    super(
      `Unable to obtain the lock ${mutex} within ${timeoutSeconds} seconds`
    );
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotImplementedError extends Error {
  constructor() {
    super('Not implemented!');
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnknownDialectError extends Error {
  constructor(dialect) {
    super(`Unknown sequelize dialect ${dialect}`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  AlreadyObtainedError,
  TableLockedError,
  LockTimeoutError,
  NotImplementedError,
  UnknownDialectError
};
