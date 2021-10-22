const SequelizeQueryInterface = require('./sequelize');
const KnexQueryInterface = require('./knex');
const PGQueryInterface = require('./pg');
const { UnableToLocateQueryInterfaceError, UnknownQueryInterfaceError } = require('../error');

const queryInterfaces = [
  KnexQueryInterface,
  SequelizeQueryInterface,
  PGQueryInterface
].reduce((acc, queryInterface) => ({ ...acc, [queryInterface.interfaceName]: queryInterface }), {});

const locateQueryInterfaceName = (queryInterface) => {
  const matchedInterface = Object.values(queryInterfaces).find((queryInterfaceImpl) => {
    try {
      return queryInterfaceImpl.checkInterface && queryInterfaceImpl.checkInterface(queryInterface);
    } catch (e) {
      return false;
    }
  });
  if (!matchedInterface) {
    throw new UnableToLocateQueryInterfaceError();
  }

  return matchedInterface.interfaceName;
};

const getQueryInterface = ({ queryInterface, queryInterfaceName }) => {
  const name = queryInterfaceName || locateQueryInterfaceName(queryInterface);

  const Interface = queryInterfaces[name];
  if (!Interface) {
    throw new UnknownQueryInterfaceError(name);
  }

  return new Interface(queryInterface);
};

module.exports = getQueryInterface;
