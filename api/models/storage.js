const mysql = require("mysql2/promise");

// Connect to database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA,
});

module.exports = {
  saveFile: async (data, callback) => {
    let connection = null;
    try {
      connection = await pool.getConnection();
      const [result, _] = await connection.execute(
        "INSERT INTO `file` (`name`) VALUES (?)",
        [data.name]
      );
      connection.release();
      callback(null, result.insertId);
    } catch (error) {
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
  getFiles: async (callback) => {
    let connection = null;
    try {
      connection = await pool.getConnection();
      const [result, _] = await connection.execute("SELECT * FROM `file`", []);
      connection.release();
      callback(null, result);
    } catch (error) {
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
  getFile: async (data, callback) => {
    let connection = null;
    try {
      connection = await pool.getConnection();
      const [result, _] = await connection.execute(
        "SELECT `name` FROM `file` WHERE `file_id` = ?",
        [data.id]
      );
      connection.release();
      callback(null, result[0]);
    } catch (error) {
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
};
