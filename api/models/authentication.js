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
  getPassword: async (username) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT `password` FROM `user` WHERE `username` = ?",
        [username]
      );
      return rows[0].password;
    } catch (error) {
      throw error;
    }
  },
  getUserId: async (username) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT `user_id` FROM `user` WHERE `username` = ?",
        [username]
      );
      return rows[0].user_id;
    } catch (error) {
      throw error;
    }
  },
  getRole: async (userId) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT `name` FROM `user_role` t JOIN `role` r ON t.`role_id` = r.`role_id` WHERE `user_id` = ?",
        [userId]
      );
      return rows[0].name;
    } catch (error) {
      throw error;
    }
  },

  storeUser: async ({ username, hash, regionId, roleId }) => {
    await testConnection();

    await db.transaction();
    try {
      const userId = await db.insert(
        "INSERT INTO `user` (`username`, `password`, `region_id`) VALUES (?, ?, ?)",
        [username, hash, regionId]
      );
      await db.insert(
        "INSERT INTO `user_role` (`user_id`, `role_id`) VALUES (?, ?)",
        [userId, roleId]
      );

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },

  getUsername: async ({ userId }) => {
    await testConnection();
    try {
      const result = await db
        .get("SELECT `username` FROM `user` WHERE `user_id` = ?", [userId])
        .then((res) => res[0].username);
      return result;
    } catch (error) {
      throw error;
    }
  },
};
