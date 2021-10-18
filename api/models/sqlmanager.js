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
  }

  executeQuery(qry) {
    return this._sequelize.query(qry, {
      type: QueryTypes.SELECT,
    });
  }

  get(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      { type: QueryTypes.SELECT }
    );
  }

  async insert(qry, vals) {
    return this._sequelize
      .query(
        {
          query: qry,
          values: vals,
        },
        { type: QueryTypes.INSERT }
      )
      .then((res) => res[0]);
  }

  update(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      { type: QueryTypes.UPDATE }
    );
  }

  delete(qry, vals) {
    return this._sequelize.query(
      {
        query: qry,
        values: vals,
      },
      { type: QueryTypes.DELETE }
    );
  }

  ping() {
    return this._sequelize.authenticate();
  }

  transaction() {
    return this._sequelize.transaction();
  }
}

module.exports = SqlManager;
