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
      await db.delete("DELETE FROM `file_metadata` WHERE `file_id` = ?", [
        data.fileId,
      ]);
      for await (const meta of data.metadata) {
        const [ruleId, tuples] = meta;

        for await (const tuple of tuples) {
          const [filterData, distance] = tuple;
          const filterId = filterData.filter;
          const packets = filterData.packets;

          const oldFilterMetadata = await db.get(
            "SELECT * FROM `file_metadata_filter` WHERE `file_id` = ? AND `filter_id` = ?",
            [data.fileId, filterId]
          );

          if (oldFilterMetadata.length > 0) {
            await db.update(
              "UPDATE `file_metadata_filter` SET `min_distance` = ? WHERE `file_id` = ? AND `filter_id` = ?",
              [distance, data.fileId, filterId]
            );
          } else {
            await db.insert(
              "INSERT INTO `file_metadata_filter`(`file_id`, `filter_id`, `min_distance`) VALUES (?, ?, ?)",
              [data.fileId, filterId, distance]
            );
          }

          for await (const packet of packets) {
            const { guid, values } = packet;
            for await (const k of Object.keys(values)) {
              const constraintId = parseInt(k);
              const valueList = Array.isArray(values[k])
                ? values[k]
                : [values[k]];

              const metadataId = await db.insert(
                "INSERT INTO `file_metadata`(`file_id`, `constraint_id`, `ifc_guid`) VALUES (?, ?, ?)",
                [data.fileId, constraintId, guid]
              );

              for await (const singleValue of valueList) {
                await db.insert(
                  "INSERT INTO `metadata_value`(`file_metadata_id`, `value`) VALUES (?, ?)",
                  [metadataId, singleValue]
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
      const filterMeta = {};

      for await (const filter of filters) {
        const filterMetadata = await db.get(
          "SELECT `min_distance` FROM `file_metadata_filter` WHERE `file_id` = ? AND `filter_id` = ?",
          [data.fileId, filter.filter_id]
        );

        filterMeta[`${filter.name}`] = {
          distance: filterMetadata[0].min_distance,
        };

        const constraints = await db.get(
          "SELECT `constraint_id` FROM `constraint` WHERE `filter_id` = ?",
          [filter.filter_id]
        );

        const constraintIds = constraints.map((c) => c.constraint_id);

        let result = [];
        for await (const constraintId of constraintIds) {
          const metadata = await db.get(
            "SELECT m.`ifc_guid`, c.`attribute`, m.`file_metadata_id` " +
              "FROM `file_metadata` m " +
              "JOIN `constraint` c ON c.`constraint_id` = m.`constraint_id` " +
              "WHERE m.`file_id` = ? AND m.`constraint_id` = ?",
            [data.fileId, constraintId]
          );

          for await (const metavalue of metadata) {
            const values = await db.get(
              "SELECT `value` FROM `metadata_value` WHERE `file_metadata_id` = ?",
              [metavalue.file_metadata_id]
            );

            const typedValues = values.map((v) =>
              /^\d+$/.test(v.value)
                ? parseInt(v.value)
                : /^\d+\.\d+$/.test(v.value)
                ? parseFloat(v.value)
                : /^true$/i.test(v.value)
                ? true
                : /^false$/i.test(v.value)
                ? false
                : v.value
            );

            result.push({ ...metavalue, value: typedValues });
          }
        }

        const valuesByGuid = ((arr, property) => {
          return arr.reduce((acc, cur) => {
            acc[cur[property]] = [...(acc[cur[property]] || []), cur];
            return acc;
          }, {});
        })(result, "ifc_guid");

        const packets = [];
        for (const guid of Object.keys(valuesByGuid)) {
          const guidValues = valuesByGuid[guid];
          const packet = { guid };
          for (const value of guidValues) {
            packet[value.attribute] = value.value;
          }
          packets.push(packet);
        }

        filterMap[`${filter.name}`] = packets;
      }

      return {
        ruleMetadata: filterMeta,
        ruleMap: filterMap,
      };
    } catch (error) {
      callback(error);
    }
  },
};
