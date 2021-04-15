const SequelizeQueryInterface = require('./sequelize');
const KnexQueryInterface = require('./knex');
const { UnableToLocateQueryInterfaceError, UnknownQueryInterfaceError } = require('../error');

const queryInterfaces = [
  KnexQueryInterface,
  SequelizeQueryInterface
].reduce((acc, queryInterface) => ({ ...acc, [queryInterface.interfaceName]: queryInterface }), {});

const locateQueryInterfaceName = (queryInterface) => {
  const matchedInterface = Object.values(queryInterfaces).find((queryInterfaceImpl) => queryInterfaceImpl.checkInterface && queryInterfaceImpl.checkInterface(queryInterface));
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
