const { Pool } = require('pg');

const createPool = async ({ dialect, connection }) => {
  if (dialect !== 'postgres') {
    throw new Error('PG client can only be used with postgres dialect');
  }
  const pool = new Pool({ connectionString: connection });
  return pool;
};

const onClose = async (client) => {
  await client.end();
};

module.exports = [
  { name: 'PG Pool', create: createPool, onClose }
];
