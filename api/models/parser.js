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

const getRuleMetadata = async (data) => {
  await testConnection();
  try {
    const filters = await db.get(
      "SELECT [filter_id], [index], [name] FROM [ifc_bim].[filter] WHERE [rule_id] = ?",
      [data.ruleId]
    );

    const filterMap = [];
    for await (const filter of filters) {
      const spaces = await db
        .get(
          "SELECT s.[name] FROM [ifc_bim].[space] s JOIN [ifc_bim].[filter_space] r ON s.[space_id] = r.[space_id] WHERE [filter_id] = ?",
          [filter.filter_id]
        )
        .then((res) => res.map((v) => v.name));

      const constraints = await db.get(
        "SELECT [constraint_id] FROM [ifc_bim].[constraint] WHERE [filter_id] = ?",
        [filter.filter_id]
      );

      const constraintIds = constraints.map((c) => c.constraint_id);

      let result = [];
      for await (const constraintId of constraintIds) {
        const metadata = await db.get(
          "SELECT m.[ifc_guid], c.[attribute], m.[file_metadata_id] " +
            "FROM [ifc_bim].[file_metadata] m " +
            "JOIN [ifc_bim].[constraint] c ON c.[constraint_id] = m.[constraint_id] " +
            "WHERE m.[file_id] = ? AND m.[constraint_id] = ?",
          [data.fileId, constraintId]
        );

        const psetName = await db
          .get(
            "SELECT [name_regexp] " +
              "FROM [ifc_bim].[pset_constraint] " +
              "WHERE [constraint_id] = ?",
            [constraintId]
          )
          .then((res) => res.map((v) => v.name_regexp));

        for await (const metavalue of metadata) {
          const values = await db.get(
            "SELECT [value] FROM [ifc_bim].[metadata_value] WHERE [file_metadata_id] = ?",
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

          result.push({
            ...metavalue,
            property: psetName.length > 0 ? psetName[0] : undefined,
            value: typedValues,
          });
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
        const packet = { entity: guid.split("_")[0], id: guid.split("_")[1] };
        const packetValues = {};
        for (const value of guidValues) {
          const valueKey = !!value.property
            ? `${value.property}.${value.attribute}`
            : value.attribute;
          packetValues[valueKey] = value.value;
        }
        packet.values = packetValues;
        packets.push(packet);
      }

      filterMap.push({ spaces, meta: packets });
    }

    return filterMap;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  saveMetadata: async (data) => {
    await testConnection();

    await db.transaction();
    try {
      await db.delete(
        "DELETE FROM [ifc_bim].[file_metadata] WHERE [file_id] = ?",
        [data.fileId]
      );
      for await (const meta of data.metadata) {
        const [ruleId, tuples] = meta;

        for await (const tuple of tuples) {
          const [filterData, distance] = tuple;
          const filterId = filterData.filter;
          const packets = filterData.packets;

          const oldFilterMetadata = await db.get(
            "SELECT * FROM [ifc_bim].[file_metadata_filter] WHERE [file_id] = ? AND [filter_id] = ?",
            [data.fileId, filterId]
          );

          if (oldFilterMetadata.length > 0) {
            await db.update(
              "UPDATE [ifc_bim].[file_metadata_filter] SET [min_distance] = ? WHERE [file_id] = ? AND [filter_id] = ?",
              [distance, data.fileId, filterId]
            );
          } else {
            await db.insert(
              "INSERT INTO [ifc_bim].[file_metadata_filter]([file_id], [filter_id], [min_distance]) VALUES (?, ?, ?)",
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
                "INSERT INTO [ifc_bim].[file_metadata]([file_id], [constraint_id], [ifc_guid]) VALUES (?, ?, ?)",
                [data.fileId, constraintId, guid]
              );

              for await (const singleValue of valueList) {
                await db.insert(
                  "INSERT INTO [ifc_bim].[metadata_value]([file_metadata_id], [value]) VALUES (?, ?)",
                  [metadataId, singleValue]
                );
              }
            }
          }
        }
      }

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getRuleMetadata: async (data) => {
    await testConnection();
    try {
      const filters = await db.get(
        "SELECT [filter_id], [index], [name] FROM [ifc_bim].[filter] WHERE [rule_id] = ?",
        [data.ruleId]
      );

      const filterMap = {};
      const filterMeta = {};

      for await (const filter of filters) {
        const filterMetadata = await db.get(
          "SELECT [min_distance] FROM [ifc_bim].[file_metadata_filter] WHERE [file_id] = ? AND [filter_id] = ?",
          [data.fileId, filter.filter_id]
        );

        filterMeta[`${filter.name}`] = {
          distance: filterMetadata[0].min_distance,
        };

        const constraints = await db.get(
          "SELECT [constraint_id] FROM [ifc_bim].[constraint] WHERE [filter_id] = ?",
          [filter.filter_id]
        );

        const constraintIds = constraints.map((c) => c.constraint_id);

        let result = [];
        for await (const constraintId of constraintIds) {
          const metadata = await db.get(
            "SELECT m.[ifc_guid], c.[attribute], m.[file_metadata_id] " +
              "FROM [ifc_bim].[file_metadata] m " +
              "JOIN [ifc_bim].[constraint] c ON c.[constraint_id] = m.[constraint_id] " +
              "WHERE m.[file_id] = ? AND m.[constraint_id] = ?",
            [data.fileId, constraintId]
          );

          for await (const metavalue of metadata) {
            const values = await db.get(
              "SELECT [value] FROM [ifc_bim].[metadata_value] WHERE [file_metadata_id] = ?",
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

        filterMap[filter.name] = packets;
      }

      return {
        ruleMetadata: filterMeta,
        ruleMap: filterMap,
      };
    } catch (error) {
      throw error;
    }
  },
  deleteResults: async (fileId) => {
    await testConnection();
    await db.transaction();
    try {
      await db.delete("DELETE FROM [ifc_bim].[result] WHERE [file_id] = ?", [
        fileId,
      ]);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  saveResult: async (fileId, ruleId, tenderId, result) => {
    await testConnection();
    await db.transaction();
    try {
      const bit = result === false ? 0 : 1;

      const id = await db.insert(
        "INSERT INTO [ifc_bim].[result] ([file_id], [rule_id], [tender_id], [value]) VALUES (?, ?, ?, ?)",
        [fileId, ruleId, tenderId, bit]
      );

      result =
        !Array.isArray(result) && typeof result !== "boolean"
          ? [result]
          : result;

      if (Array.isArray(result)) {
        for await (const value of result) {
          await db.insert(
            "INSERT INTO [ifc_bim].[result_value] ([result_id], [value]) VALUES (?, ?)",
            [id, value]
          );
        }
      }
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getResults: async (fileId) => {
    await testConnection();
    try {
      const results = await db.get(
        "SELECT [result_id], [rule_id], [tender_id], [value] FROM [ifc_bim].[result] WHERE [file_id] = ?",
        [fileId]
      );
      const tenderId = results[0].tender_id;

      let data = [];
      for await (const result of results) {
        const rule = await db
          .get(
            "SELECT [name], [description] FROM [ifc_bim].[rule] WHERE [rule_id] = ?",
            [result.rule_id]
          )
          .then((res) => res[0]);

        const groupId = await db
          .get(
            "SELECT [group_id] FROM [ifc_bim].[rule_group] WHERE [rule_id] = ?",
            [result.rule_id]
          )
          .then((res) => res[0].group_id);

        const groupName = await db
          .get("SELECT [name] FROM [ifc_bim].[group] WHERE [group_id] = ?", [
            groupId,
          ])
          .then((res) => res[0].name);

        const values = await db
          .get(
            "SELECT [value] FROM [ifc_bim].[result_value] WHERE [result_id] = ?",
            [result.result_id]
          )
          .then((res) => res.map((v) => v.value));

        const details = await getRuleMetadata({
          fileId,
          ruleId: result.rule_id,
        });

        data.push({
          name: rule.name,
          description: rule.description || "",
          group: groupName,
          bit: result.value,
          values: values,
          details,
        });
      }

      return { results: data, tenderId };
    } catch (error) {
      throw error;
    }
  },
};
