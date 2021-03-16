const PostgresLock = require('./postgres');
const { UnknownDialectError } = require('../error');

const lockInterfaces = [
  PostgresLock
].reduce((acc, lockInterface) => ({ ...acc, [lockInterface.dialect]: lockInterface }), {});

const getLockInterface = (dialect) => {
  const Interface = lockInterfaces[dialect];
  if (!Interface) {
    throw new UnknownDialectError(dialect);
  }

  return new Interface();
};

module.exports = getLockInterface;
