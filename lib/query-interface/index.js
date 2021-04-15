const { has } = require('lodash');
const SequelizeQueryInterface = require('./sequelize');
const { UnableToLocateQueryInterfaceError, UnknownQueryInterfaceError } = require('../error');

const queryInterfaces = [
  SequelizeQueryInterface
].reduce((acc, queryInterface) => ({ ...acc, [queryInterface.interfaceName]: queryInterface }), {});

const queryInterfaceLookupMap = [
  { name: 'sequelize', validator: (queryInterface) => has(queryInterface, 'sequelize') },
];

const locateQueryInterfaceName = (queryInterface) => {
  const { name } = queryInterfaceLookupMap.find(({ validator }) => validator(queryInterface)) || {};
  if (!name) {
    throw new UnableToLocateQueryInterfaceError();
  }

  return name;
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
