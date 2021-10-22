const LockInterface = require('./base');

class PostgresLock extends LockInterface {
  createSchema(schema) {
    return `CREATE SCHEMA IF NOT EXISTS ${schema};`;
  }

  createLockTable(tableName) {
    return `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        mutex VARCHAR(36) NOT NULL,
        ts TIMESTAMPTZ NOT NULL,
        node_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (mutex)
      )
    `;
  }

  removeStaleLocks(tableName, lockTTLSeconds) {
    return `
      DELETE FROM ${tableName}
      WHERE ts < NOW() - INTERVAL '${lockTTLSeconds} seconds'
    `;
  }

  lockTable(tableName, wait = false) {
    return `
      LOCK TABLE ${tableName} IN ACCESS EXCLUSIVE MODE ${wait ? '' : 'NOWAIT'}
    `;
  }

  obtainMutex(tableName) {
    return `
      INSERT INTO ${tableName} (mutex, ts, node_id)
      VALUES (:mutex, NOW(), :nodeId) ON CONFLICT(mutex) DO UPDATE SET mutex=EXCLUDED.mutex RETURNING node_id;
    `;
  }

  removeMutex(tableName) {
    return `
      DELETE FROM ${tableName}
      WHERE mutex = :mutex AND node_id = :nodeId;
    `;
  }
}

PostgresLock.dialect = 'postgres';

module.exports = PostgresLock;
