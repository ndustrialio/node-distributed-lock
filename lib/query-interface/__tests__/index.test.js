const path = require('path');
const fs = require('fs');
const getQueryInterface = require('..');
const { UnableToLocateQueryInterfaceError, UnknownQueryInterfaceError } = require('../../error');

const NON_INTERFACES = new Set(['base.js', 'index.js']);

describe('getQueryInterface', () => {
  test('throws an error when the dialect does not exist', () => {
    expect(() => getQueryInterface({ queryInterfaceName: 'random' })).toThrow(UnknownQueryInterfaceError);
  });

  test('throws an error when unable to dynamically locate the interface name', () => {
    expect(() => getQueryInterface({ queryInterface: {} })).toThrow(UnableToLocateQueryInterfaceError);
  });

  test('returns the correct interface matching by dialect name', () => {
    const names = fs
      .readdirSync(path.join(__dirname, '../'), { withFileTypes: true })
      .filter((queryInterface) => queryInterface.isFile() && !NON_INTERFACES.has(queryInterface.name))
      .map(({ name: queryInterfaceName }) => {
        const queryInterface = require(path.join(__dirname, '../', queryInterfaceName)); // eslint-disable-line
        expect(queryInterface).toBeDefined();
        return queryInterface.interfaceName;
      });

    names.forEach((queryInterfaceName) => {
      const queryInterface = getQueryInterface({ queryInterfaceName });
      expect(queryInterface).toBeDefined();
    });
  });
});
