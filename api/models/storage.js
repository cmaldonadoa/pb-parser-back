const SqlManager = require("./sqlmanager");

const db = new SqlManager();

const testConnection = async () => {
  try {
    await db.ping();
    return true;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    return false;
  }
};

module.exports = {
  saveFile: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const result = await db.insert("INSERT INTO `file` (`name`) VALUES (?)", [
        data.name,
      ]);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },
  getFiles: async (callback) => {
    try {
      const result = await db.get("SELECT * FROM `file`", []);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },
  getFile: async (data, callback) => {
    try {
      const result = await db.get(
        "SELECT `name` FROM `file` WHERE `file_id` = ?",
        [data.id]
      );
      callback(null, result[0]);
    } catch (error) {
      callback(error);
    }
  },
};
