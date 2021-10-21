const KnexJs = require('knex');

const getClientType = (dialect) => {
  if (dialect === 'postgres') {
    return 'pg';
  }

  throw new Error('Unknown dialect');
};

const onClose = async (client) => {
  client.destroy();
};

const createClient = async ({ dialect, connection }) => new KnexJs({
  client: getClientType(dialect),
  connection
});

module.exports = [
  { name: 'KnexJs', create: createClient, queryMethod: 'raw', onClose },
];
