const path = require('path');
const fs = require('fs');
const getLockInterface = require('..');
const { UnknownDialectError } = require('../../error');

const NON_DIALECTS = new Set(['base.js', 'index.js']);

describe('getLockInterface', () => {
  test('throws an error when the dialect does not exist', () => {
    expect(() => getLockInterface('random')).toThrow(UnknownDialectError);
  });

  test('returns the correct interface matching by dialect name', () => {
    const names = fs
      .readdirSync(path.join(__dirname, '../'), { withFileTypes: true })
      .filter((dialect) => dialect.isFile() && !NON_DIALECTS.has(dialect.name))
      .map(({ name: dialect }) => {
        const dialectInterface = require(path.join(__dirname, '../', dialect)); // eslint-disable-line
        expect(dialectInterface).toBeDefined();
        return dialectInterface.dialect;
      });

    names.forEach((dialectName) => {
      const dialectInterface = getLockInterface(dialectName);
      expect(dialectInterface).toBeDefined();
    });
  });
});
