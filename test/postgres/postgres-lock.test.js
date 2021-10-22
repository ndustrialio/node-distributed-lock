const faker = require('faker');
const DistributedLock = require('../../lib');
const knexClients = require('../interface/knex');
const pgClients = require('../interface/pg');
const sequelizeClients = require('../interface/sequelize');

const POSTGRES_CONNECTION = process.env.POSTGRES_CONNECTION || 'postgres://user:pass@localhost:5400/db';

const clients = [
  ...knexClients,
  ...sequelizeClients,
  ...pgClients
];

describe('Postgres Lock', () => {
  const lockTableName = `test_lock_${faker.internet.domainWord().replace(/-_/, '').toLowerCase()}`;
  const testSchema = `${faker.internet.domainWord().replace(/-_/, '').toLowerCase()}`;

  describe.each(clients)('using $name', ({ create, queryMethod = 'query', onClose }) => {
    let client;

    beforeAll(async () => {
      client = await create({ dialect: 'postgres', connection: POSTGRES_CONNECTION });
      await client[queryMethod](`DROP TABLE IF EXISTS ${lockTableName};`);
      await client[queryMethod](`DROP SCHEMA IF EXISTS ${testSchema} CASCADE;`);
    });

    afterAll(async () => {
      await client[queryMethod](`DROP TABLE IF EXISTS ${lockTableName};`);
      await client[queryMethod](`DROP SCHEMA IF EXISTS ${testSchema} CASCADE;`);
      if (onClose) {
        await onClose(client);
      }
    });

    test('lock', async () => {
      const sleepMilliseconds = 50;

      const execute = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return Date.now();
      };

      const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: client.queryInterface || client, lockTableName }));
      const start = Date.now();
      const results = await Promise.all(locks.map((lock) => lock.lock(execute, { sleepMilliseconds })));
      const end = Date.now();
      expect(end - start).toBeGreaterThan(sleepMilliseconds * 5);

      results.sort();
      for (let i = 0; i < results.length; i++) {
        expect(end).toBeGreaterThan(results[i]);
        if (i > 0) {
          expect(results[i] - sleepMilliseconds).toBeGreaterThanOrEqual(results[i - 1]); // should be at least sleepMilliseconds separated
        }
      }
    });

    test('lock with a specified schema', async () => {
      const sleepMilliseconds = 50;

      const execute = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return Date.now();
      };

      const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: client.queryInterface || client, lockTableName: `${testSchema}.${lockTableName}` }));
      const start = Date.now();
      const results = await Promise.all(locks.map((lock) => lock.lock(execute, { sleepMilliseconds })));
      const end = Date.now();
      expect(end - start).toBeGreaterThan(sleepMilliseconds * 5);

      results.sort();
      for (let i = 0; i < results.length; i++) {
        expect(end).toBeGreaterThan(results[i]);
        if (i > 0) {
          expect(results[i] - sleepMilliseconds).toBeGreaterThanOrEqual(results[i - 1]); // should be at least sleepMilliseconds separated
        }
      }
    });

    test('lock with skipIfObtained set', async () => {
      const sleepMilliseconds = 50;

      const execute = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return Date.now();
      };

      const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: client.queryInterface || client, lockTableName, skipIfObtained: true }));
      const start = Date.now();
      const results = await Promise.all(locks.map((lock) => lock.lock(execute, { sleepMilliseconds })));
      const end = Date.now();
      expect(end - start).toBeGreaterThan(sleepMilliseconds * 5);

      expect(results).toHaveLength(5);
      const executedResults = results.filter((result) => result !== DistributedLock.EXECUTION_SKIPPED);
      expect(executedResults).toHaveLength(1);
    });
  });
});
