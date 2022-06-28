const pgClients = require('../test/interface/pg');
const DistributedLock = require('./distributed-lock');

const lockTableName = 'lock';
const POSTGRES_CONNECTION = process.env.POSTGRES_CONNECTION || 'postgres://user:pass@localhost:5400/db';
(async () => {
  const [{ create, queryMethod = 'query' }] = [...pgClients];
  const client = await create({ dialect: 'postgres', connection: POSTGRES_CONNECTION });
  await client[queryMethod](`DROP TABLE IF EXISTS ${lockTableName};`);
  const lock = new DistributedLock('test', { queryInterface: client.queryInterface || client, lockTableName });
  await lock.lock(async () => new Promise((resolve) => {
    setTimeout(resolve, 100000);
  }));
  console.log('done');
  await client[queryMethod](`DROP TABLE IF EXISTS ${lockTableName};`);
})();
