# Node Distributed Lock

[![Build Status](https://badgen.net/github/release/ndustrialio/sequelize-distributed-lock)](https://github.com/ndustrialio/sequelize-distributed-lock/actions?query=workflow%3ABuild)
[![npm (stable)](https://badgen.net/npm/v/@ndustrial/sequelize-distributed-lock)](https://www.npmjs.com/package/@ndustrial/sequelize-distributed-lock)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Node Distributed Lock (NDL) is a client- and dialect-agnostic distributed locking tool for NodeJS applications. It can be used to orchestrate database migrations in a distributed setting or as a general distributed locking capability for any use.

Unlike other popular distributed locking tools that enforce a specific migration library or provide same-transaction locking, NDL can be used to lock across distributed nodes for the duration of your arbitriary action, whether it be another database write, a cleanup job, or even triggering a lambda function.

_**Note:** A lock table will be created to store the locks in the database._

Currently, the following database clients/ORMs are supported. Please open an issue or contribute with your own PR to help grow the list:

| Database Client                                     | Supported |
| --------------------------------------------------- |   :---:   |
| [Sequelize](https://github.com/sequelize/sequelize) | X         |
| [KnexJs](http://knexjs.org/)                        |           |

Currently, the following dialects are supported. Please open an issue or contribute with your own PR to help grow the list:

| Database Dialect      | Supported |
| --------------------- |   :---:   |
| PostgreSQL            | X         |
| MySQL                 |           |
| MariaDB               |           |
| SQLite                |           |
| Microsoft SQL Server  |           |

## Installation

```sh
npm install @ndustrial/sequelize-distributed-lock
```

## Highlights

- Works with the popular ORM Sequelize out of the box
- Supports other query interfaces/database clients
- Does not enforce same-transaction locking
- Supports independent locks (locks are named)

## Simple Example

### Sequelize

```js
// index.js
const Sequelize = require('sequelize');
const DistributedLock = require('@ndustrialio/sequelize-distributed-lock');

const sequelize = new Sequelize({...});

const importantLogic = async () => {
  // will never run at the same time
}

const importantLock = new DistributedLock('my-important-logic-lock', {
  queryInterface: sequelize.queryInterface
});

importantLock
  .lock(importantLogic) // Ensures importantLogic is run by a single node at a time
  .then(() => {
    console.log('Done!');
  });
```

### KnexJS
```js
// index.js
const KnexJs = require('knex');
const DistributedLock = require('@ndustrialio/sequelize-distributed-lock');

const knex = new KnexJs({...});

const importantLogic = async () => {
  // will never run at the same time
}

const importantLock = new DistributedLock('my-important-logic-lock', {
  queryInterface: knex
});

importantLock
  .lock(importantLogic) // Ensures importantLogic is run by a single node at a time
  .then(() => {
    console.log('Done!');
  });
```

If the above code was scaled to >1 nodes, each node will create its own instance of the distributed lock and call the `.lock()` method; however, only one node will run the method `importantLock` at the same time. Once the logic is completed on one node, the next node will be able to obtain the lock and call the method.

It is important to note that, with current functionality, the `importantLock()` method will be called by **every** node, just never at the same time. In the world of database migrations, this is expected functionality, as the migration table will be up-to-date after the first execution.

## Configuration

The  `DistributedLock(lockName, params)` constructure allows some configuration to alter the behavior of the locking mechanism.

First and foremost, the `lockName` is used to ensure all distributed locks are locking on the same mutex. This enables you to create multiple locks in the same deployment and manage them independently.

The following values are passed in via the `params` argument.

| Configuration Name | Description                                                         | Required | Default            |
| ------------------ | ------------------------------------------------------------------- |   :---:  |        :---:       |
| queryInterface     | The query interface database client                                 | X        |                    |
| queryInterfaceName | The name of the query database client (i.e. `sequelize`, `knex`)    |          |                    |
| lockTableName      | The name of the table that will hold locks                          |          | `distributed_lock` |
| lockTTLSeconds     | The time (seconds) after which locks should expire                  |          | 1200               |
| skipIfObtained     | Whether subsequent lock calls to an obtained lock should exit early |          | `false`            |

**NOTE:** If you omit the `queryInterfaceName`, NDL will attempt to determine it based on the interface object.
### Single Execution

An option called `skipIfObtained` can be set to `true` in order to indicate that simultaneous lock calls on the same mutext should exit early if the lock mutex has already been obtained. This can be used to ensure that a single caller gains access to running the logic at any given time and subsequent callers will not run it immediately after.

Callers that have exited early due to this flag will resolve a result equal to the symbol `DistributedLock.EXECUTION_SKIPPED`.

## License

See the [LICENSE](./LICENSE).