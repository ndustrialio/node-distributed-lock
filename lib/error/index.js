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
    super(`Unknown SQL dialect ${dialect}`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnknownQueryInterfaceError extends Error {
  constructor(name) {
    super(`Unknown query interface ${name}`);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnableToLocateQueryInterfaceError extends Error {
  constructor() {
    super('Unable to locate the query interface type. Try to pass in the property "queryInterfaceName".');
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  AlreadyObtainedError,
  TableLockedError,
  LockTimeoutError,
  NotImplementedError,
  UnknownDialectError,
  UnableToLocateQueryInterfaceError,
  UnknownQueryInterfaceError
};
