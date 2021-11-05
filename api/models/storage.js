const SqlManager = require("./sqlmanager");

const db = new SqlManager();

const testConnection = async () => {
  try {
    await db.ping();
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  saveFile: async (userId, data) => {
    await testConnection();

    await db.transaction();
    try {
      const typeId = await db
        .get(
          "SELECT [model_type_id] FROM [ifc_bim].[model_type] WHERE [name] = ?",
          [data.type]
        )
        .then((res) => res[0].model_type_id);

      const result = await db.insert(
        "INSERT INTO [ifc_bim].[file] ([name], [model_type_id], [created_by]) VALUES (?, ?, ?)",
        [data.name, typeId, userId]
      );

      await db.commit();
      return result;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getFiles: async (userId) => {
    await testConnection();

    try {
      const result = await db.get(
        "SELECT [file_id], f.[name] filename, r.[name] typename, [upload_date] FROM [ifc_bim].[file] f " +
          "JOIN [ifc_bim].[model_type] r ON f.[model_type_id] = r.[model_type_id] " +
          "WHERE f.[created_by] = ?",
        [userId]
      );
      return result;
    } catch (error) {
      throw error;
    }
  },
  getFile: async (data) => {
    await testConnection();

    try {
      const result = await db
        .get("SELECT * FROM [ifc_bim].[file] WHERE [file_id] = ?", [data.id])
        .then((res) => res[0]);
      return result;
    } catch (error) {
      throw error;
    }
  },
  getFileWithType: async (data) => {
    await testConnection();

    try {
      const result = await db
        .get("SELECT * FROM [ifc_bim].[file] WHERE [file_id] = ?", [
          data.fileId,
        ])
        .then((res) => res[0]);

      const type = await db.get(
        "SELECT [name] FROM [ifc_bim].[model_type] WHERE [model_type_id] = ?",
        [result.model_type_id]
      );

      return { file: result, type };
    } catch (error) {
      throw error;
    }
  },

  getFilesUser: async (userId) => {
    await testConnection();

    try {
      const result = await db.get(
        "SELECT [file_id] FROM [ifc_bim].[file] WHERE [created_by] = ?",
        [userId]
      );
      return result;
    } catch (error) {
      throw error;
    }
  },

  deleteFile: async (fileId) => {
    await testConnection();

    await db.transaction();
    try {
      await db.delete("DELETE FROM [ifc_bim].[file] WHERE [file_id] = ?", [
        fileId,
      ]);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
};
