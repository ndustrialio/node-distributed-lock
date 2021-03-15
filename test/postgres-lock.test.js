const Sequelize = require('sequelize');
const faker = require('faker');
const DistributedLock = require('../lib');

const POSTGRES_CONNECTION = process.env.POSTGRES_CONNECTION || 'postgres://user:pass@localhost:5400/db';

describe('Postgres Lock', () => {
  const lockTableName = `test_lock_${faker.internet.domainWord().replace(/-_/, '').toLowerCase()}`;
  let sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize(POSTGRES_CONNECTION, {
      dialect: 'postgres',
      logging: () => {},
    });
    await sequelize.authenticate();
    await sequelize.query(`DROP TABLE IF EXISTS ${lockTableName};`);
  });

  afterAll(async () => {
    await sequelize.query(`DROP TABLE IF EXISTS ${lockTableName};`);
  });

  test('lock', async () => {
    jest.setTimeout(30000);
    const sleepMiliseconds = 500;

    const execute = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return Date.now();
    };

    const locks = [...Array(5).keys()].map(() => new DistributedLock('test', { queryInterface: sequelize.queryInterface, lockTableName }));
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
});
