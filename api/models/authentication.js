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

    const rows = await db.get(
      "SELECT `password` FROM `user` WHERE `username` = ?",
      [username]
    );
    callback(false, rows[0].password);
  },
  getUserId: async (username, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    const rows = await db.get(
      "SELECT `user_id` FROM `user` WHERE `username` = ?",
      [username]
    );
    callback(false, rows[0].user_id);
  },
  getRole: async (userId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    const rows = await db.get(
      "SELECT `name` FROM `user_role` t JOIN `role` r ON t.`role_id` = r.`role_id` WHERE `user_id` = ?",
      [userId]
    );
    callback(false, rows[0].name);
  },

  storeUser: async ({ username, hash, regionId, roleId }, callback) => {
    if (!testConnection()) {
      callback();
      return;
    }

    const userId = await db.insert(
      "INSERT INTO `user` (`username`, `password`, `region_id`) VALUES (?, ?, ?)",
      [username, hash, regionId]
    );
    await db.insert(
      "INSERT INTO `user_role` (`user_id`, `role_id`) VALUES (?, ?)",
      [userId, roleId]
    );

    callback();
  },
};
