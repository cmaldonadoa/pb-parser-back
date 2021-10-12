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
  saveFile: async (userId, data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const typeId = await db
        .get("SELECT `model_type_id` FROM `model_type` WHERE `name` = ?", [
          data.type,
        ])
        .then((res) => res[0].model_type_id);

      const result = await db.insert(
        "INSERT INTO `file` (`name`, `model_type_id`, `created_by`) VALUES (?, ?, ?)",
        [data.name, typeId, userId]
      );

      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },
  getFiles: async (callback) => {
    try {
      const result = await db.get(
        "SELECT `file_id`, f.`name` filename, r.`name` typename, `upload_date` FROM `file` f JOIN `model_type` r ON f.`model_type_id` = r.`model_type_id`",
        []
      );
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },
  getFile: async (data, callback) => {
    try {
      const result = await db
        .get("SELECT * FROM `file` WHERE `file_id` = ?", [data.id])
        .then((res) => res[0]);
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },
  getFileWithType: async (data, callback) => {
    try {
      const result = await db
        .get("SELECT * FROM `file` WHERE `file_id` = ?", [data.fileId])
        .then((res) => res[0]);

      const type = await db.get(
        "SELECT `name` FROM `model_type` WHERE `model_type_id` = ?",
        [result.model_type_id]
      );
      callback(null, { file: result, type });
    } catch (error) {
      callback(error);
    }
  },

  getFilesUser: async (userId, callback) => {
    try {
      const result = await db.get(
        "SELECT `file_id` FROM `file` WHERE `created_by` = ?",
        [userId]
      );
      callback(null, result);
    } catch (error) {
      callback(error);
    }
  },

  deleteFile: async (fileId, callback) => {
    try {
      await db.delete("DELETE FROM `file` WHERE `file_id` = ?", [fileId]);
      callback(null);
    } catch (error) {
      callback(error);
    }
  },
};
