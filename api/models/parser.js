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
  saveMetadata: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    const t = await db.transaction();
    try {
      for await (const rule of data.metadata) {
        for await (const filter of rule) {
          for await (const packet of filter) {
            const { guid, values } = packet;
            for await (const k of Object.keys(values)) {
              const constraintId = parseInt(k);
              const value = values[k];

              const oldValues = await db.get(
                "SELECT * FROM `file_metadata` WHERE `file_id` = ? AND `constraint_id` = ?",
                [data.fileId, constraintId]
              );

              if (oldValues.length > 0) {
                await db.update(
                  "UPDATE `file_metadata` SET `value` = ?, `ifc_guid` = ? WHERE `file_id` = ? AND `constraint_id` = ?",
                  [value, guid, data.fileId, constraintId]
                );
              } else {
                await db.insert(
                  "INSERT INTO `file_metadata`(`file_id`, `constraint_id`, `value`, `ifc_guid`) VALUES (?, ?, ?, ?)",
                  [data.fileId, constraintId, value, guid]
                );
              }
            }
          }
        }
      }

      await t.commit();
      callback(null);
    } catch (error) {
      await t.rollback();
      callback(error);
    }
  },
  getRuleMetadata: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const filters = await db.get(
        "SELECT `filter_id`, `index` FROM `filter` WHERE `rule_id` = ?",
        [data.ruleId]
      );

      const filterMap = {};

      for await (const filter of filters) {
        const constraints = await db.get(
          "SELECT `constraint_id` FROM `constraint` WHERE `filter_id` = ?",
          [filter.filter_id]
        );

        const constraintIds = constraints.map((c) => c.constraint_id);
        const values = await db.get(
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
    }
  },
};
