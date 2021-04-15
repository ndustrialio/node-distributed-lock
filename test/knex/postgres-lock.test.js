const KnexJs = require('knex');
const faker = require('faker');
const DistributedLock = require('../../lib');

const POSTGRES_CONNECTION = process.env.POSTGRES_CONNECTION || 'postgres://user:pass@localhost:5400/db';

describe('Knex: Postgres Lock', () => {
  const lockTableName = `test_lock_${faker.internet.domainWord().replace(/-_/, '').toLowerCase()}`;
  let knex;

  beforeAll(async () => {
    knex = new KnexJs({
      client: 'pg',
      connection: POSTGRES_CONNECTION,
    });
    await knex.raw('SELECT 1+1 AS result');
    await knex.raw(`DROP TABLE IF EXISTS ${lockTableName};`);
  });

  afterAll(async () => {
    await knex.raw(`DROP TABLE IF EXISTS ${lockTableName};`);
  });

  test('lock', async () => {
    jest.setTimeout(30000);
    const sleepMiliseconds = 500;

    const execute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return Date.now();
    };

    const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: knex, lockTableName }));
    const start = Date.now();
    const results = await Promise.all(locks.map((lock) => lock.lock(execute, { sleepMiliseconds })));
    const end = Date.now();
    expect(end - start).toBeGreaterThan(sleepMiliseconds * 5);

    results.sort();
    for (let i = 0; i < results.length; i++) {
      expect(end).toBeGreaterThan(results[i]);
      if (i > 0) {
        expect(results[i] - sleepMiliseconds).toBeGreaterThanOrEqual(results[i - 1]); // should be at least sleepMiliseconds separated
      }
    }
  });

  test('lock with skipIfObtained set', async () => {
    jest.setTimeout(30000);
    const sleepMiliseconds = 500;

    const execute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return Date.now();
    };

    const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: knex, lockTableName, skipIfObtained: true }));
    const start = Date.now();
    const results = await Promise.all(locks.map((lock) => lock.lock(execute, { sleepMiliseconds })));
    const end = Date.now();
    expect(end - start).toBeGreaterThan(sleepMiliseconds * 5);

    expect(results).toHaveLength(5);
    const executedResults = results.filter((result) => result !== DistributedLock.EXECUTION_SKIPPED);
    expect(executedResults).toHaveLength(1);
  });
});
