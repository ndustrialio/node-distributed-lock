const Sequelize = require('sequelize');

const createClient = async ({ dialect, connection }) => new Sequelize(connection, {
  dialect,
  logging: () => {},
});

const onClose = async (client) => {
  client.close();
};

module.exports = [
  { name: 'Sequelize', create: createClient, onClose },
];
