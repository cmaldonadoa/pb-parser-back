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
  getPassword: async (username, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get(
        "SELECT [password] FROM [ifc_bim].[user] WHERE [username] = ?",
        [username]
      );
      callback(false, rows[0].password);
    } catch (error) {
      callback(error);
    }
  },
  getUserId: async (username, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await db.get(
        "SELECT [user_id] FROM [ifc_bim].[user] WHERE [username] = ?",
        [username]
      );
      callback(false, rows[0].user_id);
    } catch (error) {
      callback(error);
    }
  },
  getRole: async (userId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await db.get(
        "SELECT [name] FROM [ifc_bim].[user_role] t JOIN [ifc_bim].[role] r ON t.[role_id] = r.[role_id] WHERE [user_id] = ?",
        [userId]
      );
      callback(false, rows[0].name);
    } catch (error) {
      callback(error);
    }
  },

  storeUser: async ({ username, hash, regionId, roleId }, callback) => {
    if (!testConnection()) {
      callback();
      return;
    }
    try {
      const userId = await db.insert(
        "INSERT INTO [ifc_bim].[user] ([username], [password], [region_id]) VALUES (?, ?, ?)",
        [username, hash, regionId]
      );
      await db.insert(
        "INSERT INTO [user_role] ([user_id], [role_id]) VALUES (?, ?)",
        [userId, roleId]
      );

      callback();
    } catch (error) {
      callback();
    }
  },
};
