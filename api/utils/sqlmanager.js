const { Sequelize, QueryTypes } = require("sequelize");

class SqlManager {
  constructor() {
    this._sequelize = new Sequelize(
      process.env.DB_SCHEMA,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        port: process.env.DB_PORT,
      }
    );
    this._transaction = null;
  }

  get(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      {
        type: QueryTypes.SELECT,
        ...(!!this._transaction && { transaction: this._transaction }),
      }
    );
  }

  insert(qry, vals) {
    return this._sequelize
      .query(
        {
          query: qry,
          values: vals,
        },
        {
          type: QueryTypes.INSERT,
          ...(!!this._transaction && { transaction: this._transaction }),
        }
      )
      .then(() =>
        this._sequelize.query(
          { query: "SELECT @@IDENTITY AS id" },
          {
            type: QueryTypes.SELECT,
            ...(!!this._transaction && { transaction: this._transaction }),
          }
        )
      )
      .then((res) => res[0].id);
  }

  update(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      {
        type: QueryTypes.UPDATE,
        ...(!!this._transaction && { transaction: this._transaction }),
      }
    );
  }

  delete(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      {
        type: QueryTypes.DELETE,
        ...(!!this._transaction && { transaction: this._transaction }),
      }
    );
  }

  ping() {
    return this._sequelize.authenticate({ logging: false });
  }

  async transaction() {
    const t = await this._sequelize.transaction();
    this._transaction = t;
  }

  async commit() {
    await this._transaction.commit().then((_) => (this._transaction = null));
  }

  async rollback() {
    await this._transaction.rollback().then((_) => (this._transaction = null));
  }
}

module.exports = SqlManager;
