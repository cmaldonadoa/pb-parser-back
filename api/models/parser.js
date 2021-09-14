const mysql = require("mysql2/promise");

// Connect to database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_SCHEMA,
});

const simpleQuery = async (sql, data, callback) => {
  let connection = null;
  try {
    connection = await pool.getConnection();
    const [rows, _] = await connection.execute(sql, data);
    callback(null, rows);
  } catch (error) {
    callback(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  saveMetadata: async (data, callback) => {
    let connection = null;

    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      for await (const rule of data.metadata) {
        for await (const filter of rule) {
          for await (const packet of filter) {
            const { guid, values } = packet;
            for await (const k of Object.keys(values)) {
              const constraintId = parseInt(k);
              const value = values[k];

              const [oldValues, _] = await connection.execute(
                "SELECT * FROM `file_metadata` WHERE `file_id` = ? AND `constraint_id` = ?",
                [data.fileId, constraintId]
              );

              if (oldValues.length > 0) {
                await connection.execute(
                  "UPDATE `file_metadata` SET `value` = ?, `ifc_guid` = ? WHERE `file_id` = ? AND `constraint_id` = ?",
                  [value, guid, data.fileId, constraintId]
                );
              } else {
                await connection.execute(
                  "INSERT INTO `file_metadata`(`file_id`, `constraint_id`, `value`, `ifc_guid`) VALUES (?, ?, ?, ?)",
                  [data.fileId, constraintId, value, guid]
                );
              }
            }
          }
        }
      }

      await connection.commit();
      callback(null);
    } catch (error) {
      if (connection) await connection.rollback();
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
  getRuleMetadata: async (data, callback) => {
    let connection = null;

    try {
      connection = await pool.getConnection();
      const [filters, _1] = await connection.execute(
        "SELECT `filter_id`, `index` FROM `filter` WHERE `rule_id` = ?",
        [data.ruleId]
      );

      const filterMap = {};

      for await (const filter of filters) {
        const [constraints, _2] = await connection.execute(
          "SELECT `constraint_id` FROM `constraint` WHERE `filter_id` = ?",
          [filter.filter_id]
        );

        const constraintIds = constraints.map((c) => c.constraint_id);
        const [values, _5] = await connection.execute(
          "SELECT m.`ifc_guid`, c.`attribute`, m.`value` " +
            "FROM `file_metadata` m " +
            "JOIN `constraint` c ON c.`constraint_id` = m.`constraint_id` " +
            "WHERE m.`file_id` = ? AND m.`constraint_id` IN " +
            `(${constraintIds.map((e) => "?").join()})`,
          [data.fileId, ...constraintIds]
        );

        const typedValues = values.map((v) => ({
          ...v,
          value: /\d+/.test(v.value)
            ? parseInt(v.value)
            : /\d+\.\d+/.test(v.value)
            ? parseFloat(v.value)
            : v.value,
        }));

        const valuesByGuid = ((arr, property) => {
          return arr.reduce((acc, cur) => {
            acc[cur[property]] = [...(acc[cur[property]] || []), cur];
            return acc;
          }, {});
        })(typedValues, "ifc_guid");

        const packets = [];
        for (const guid of Object.keys(valuesByGuid)) {
          const guidValues = valuesByGuid[guid];
          const packet = { guid };
          for (const value of guidValues) {
            packet[value.attribute] = value.value;
          }
          packets.push(packet);
        }

        filterMap[`p${filter.index}`] = packets;
      }

      callback(null, filterMap);
    } catch (error) {
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
};
