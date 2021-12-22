const SqlManager = require("./sqlmanager");

const db = new SqlManager();

class Manager {
  constructor(sqlManager) {
    this.sqlManager = sqlManager;
    this.creator = {
      newRule: async (userId, name, formula, description, display) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO [ifc_bim].[rule] ([name], [formula], [description], [created_by], [display]) VALUES (?, ?, ?, ?, ?)",
          [name, formula, description, userId, display]
        );
        return result;
      },
      linkRuleGroup: async (ruleId, groupId) => {
        await this.sqlManager.insert(
          "INSERT INTO [ifc_bim].[rule_group] ([rule_id], [group_id]) VALUES (?, ?)",
          [ruleId, groupId]
        );
      },
      linkRuleModelTypes: async (ruleId, modelTypesList) => {
        for await (const modelType of modelTypesList) {
          const modelTypeId = await this.sqlManager
            .get(
              "SELECT [model_type_id] FROM [ifc_bim].[model_type] WHERE [name] = ?",
              [modelType]
            )
            .then((res) => res[0].model_type_id);

          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[rule_model_type] ([rule_id], [model_type_id]) VALUES (?, ?)",
            [ruleId, modelTypeId]
          );
        }
      },
      linkRuleBuildingTypes: async (ruleId, buildingTypesList) => {
        for await (const buildingType of buildingTypesList) {
          const buildingTypeId = await this.sqlManager
            .get(
              "SELECT [building_type_id] FROM [ifc_bim].[building_type] WHERE [name] = ?",
              [buildingType]
            )
            .then((res) => res[0].building_type_id);

          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[rule_building_type] ([rule_id], [building_type_id]) VALUES (?, ?)",
            [ruleId, buildingTypeId]
          );
        }
      },
      newFilter: async (ruleId, index, name) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO [ifc_bim].[filter] ([rule_id], [index], [name]) VALUES (?, ?, ?)",
          [ruleId, index, name]
        );
        return result;
      },
      linkFilterEntities: async (filterId, entitiesList) => {
        for await (const entity of entitiesList) {
          let entityId = null;
          const entities = await this.sqlManager.get(
            "SELECT [entity_id] FROM [ifc_bim].[entity] WHERE [name] = ?",
            [entity]
          );
          if (entities.length > 0) {
            entityId = entities[0].entity_id;
          } else {
            throw new Error("Unknown IFC entity ");
          }

          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[filter_entity] ([filter_id], [entity_id]) VALUES (?, ?)",
            [filterId, entityId]
          );
        }
      },
      linkFilterEntitiesExcluded: async (filterId, entitiesList) => {
        for await (const entity of entitiesList) {
          let entityId = null;
          const entities = await this.sqlManager.get(
            "SELECT [entity_id] FROM [ifc_bim].[entity] WHERE [name] = ?",
            [entity]
          );
          if (entities.length > 0) {
            entityId = entities[0].entity_id;
          } else {
            throw new Error("Unknown IFC entity ");
          }

          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[filter_entity_excluded] ([filter_id], [entity_id]) VALUES (?, ?)",
            [filterId, entityId]
          );
        }
      },
      linkFilterSpaces: async (filterId, spacesList) => {
        for await (const space of spacesList) {
          let spaceId = null;
          const spaces = await this.sqlManager.get(
            "SELECT [space_id] FROM [ifc_bim].[space] WHERE [name] = ?",
            [space]
          );
          if (spaces.length > 0) {
            spaceId = spaces[0].space_id;
          } else {
            const result = await this.sqlManager.insert(
              "INSERT INTO [ifc_bim].[space] ([name]) VALUES (?)",
              [space]
            );
            spaceId = result;
          }

          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[filter_space] ([filter_id], [space_id]) VALUES (?, ?)",
            [filterId, spaceId]
          );
        }
      },
      newConstraint: async (operationId, onId, filterId, attribute, index) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO [ifc_bim].[constraint] ([operation_id], [on_id], [filter_id], [attribute], [index]) VALUES (?, ?, ?, ?, ?)",
          [operationId, onId, filterId, attribute, index]
        );
        return result;
      },
      newSpecificConstraint: async (constraintId, constraintSpecification) => {
        if (constraintSpecification.type === "PSET_QTO") {
          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[pset_constraint] ([constraint_id], [name_regexp]) VALUES (?, ?)",
            [constraintId, constraintSpecification.pset]
          );
        } else if (constraintSpecification.type === "LOCATION") {
          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[location_constraint] ([constraint_id]) VALUES (?)",
            [constraintId]
          );
        } else {
          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[attribute_constraint] ([constraint_id]) VALUES (?)",
            [constraintId]
          );
        }
      },
      newExpectedValues: async (valuesList, constraintId) => {
        for await (const value of valuesList) {
          await this.sqlManager.insert(
            "INSERT INTO [ifc_bim].[expected_value] ([constraint_id], [value]) VALUES (?, ?)",
            [constraintId, value.toString()]
          );
        }
      },
    };
    this.getter = {
      getGroups: async () => {
        const result = await this.sqlManager.get(
          "SELECT * FROM [ifc_bim].[group]"
        );
        return result;
      },
      getOperation: async (name) => {
        const result = await this.sqlManager
          .get(
            "SELECT [operation_id] FROM [ifc_bim].[operation] WHERE [name] = ?",
            [name]
          )
          .then((res) => res[0].operation_id)
          .catch((err) => -1);
        return result;
      },
      getOn: async (name) => {
        const result = await this.sqlManager
          .get("SELECT [on_id] FROM [ifc_bim].[on] WHERE [name] = ?", [name])
          .then((res) => res[0].on_id)
          .catch((err) => -1);
        return result;
      },
      getRule: async (ruleId) => {
        const result = await this.sqlManager
          .get(
            "SELECT [name], [formula], [description], [display] FROM [ifc_bim].[rule] WHERE [rule_id] = ?",
            [ruleId]
          )
          .then((res) => res[0])
          .catch((err) => ({}));
        return result;
      },
      getModelTypes: async (ruleId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.[name] FROM [ifc_bim].[model_type] e " +
              "JOIN [ifc_bim].[rule_model_type] r ON e.[model_type_id] = r.[model_type_id] " +
              "WHERE r.[rule_id] = ?",
            [ruleId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getBuildingTypes: async (ruleId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.[name] FROM [ifc_bim].[building_type] e " +
              "JOIN [ifc_bim].[rule_building_type] r ON e.[building_type_id] = r.[building_type_id] " +
              "WHERE r.[rule_id] = ?",
            [ruleId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getFilters: async (ruleId) => {
        const result = await this.sqlManager.get(
          "SELECT [filter_id], [index], [name] FROM [ifc_bim].[filter] WHERE [rule_id] = ?",
          [ruleId]
        );
        return result;
      },
      getSpaces: async (filterId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.[name] FROM [ifc_bim].[space] e " +
              "JOIN [ifc_bim].[filter_space] r ON e.[space_id] = r.[space_id] " +
              "WHERE r.[filter_id] = ?",
            [filterId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getEntities: async (filterId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.[name] FROM [ifc_bim].[entity] e " +
              "JOIN [ifc_bim].[filter_entity] r ON e.[entity_id] = r.[entity_id] " +
              "WHERE r.[filter_id] = ?",
            [filterId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getEntitiesExcluded: async (filterId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.[name] FROM [ifc_bim].[entity] e " +
              "JOIN [ifc_bim].[filter_entity_excluded] r ON e.[entity_id] = r.[entity_id] " +
              "WHERE r.[filter_id] = ?",
            [filterId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getConstraints: async (filterId) => {
        const result = await this.sqlManager.get(
          "SELECT c.[constraint_id], c.[operation_id], c.[on_id], c.[attribute], c.[index], r.[name] op_name, s.[name] on_name " +
            "FROM [ifc_bim].[constraint] c " +
            "JOIN [ifc_bim].[operation] r ON r.[operation_id] = c.[operation_id] " +
            "JOIN [ifc_bim].[on] s ON s.[on_id] = c.[on_id] " +
            "WHERE c.[filter_id] = ?",
          [filterId]
        );
        return result;
      },
      getValues: async (constraintId) => {
        const result = await this.sqlManager
          .get(
            "SELECT [value] FROM [ifc_bim].[expected_value] WHERE [constraint_id] = ?",
            [constraintId]
          )
          .then((res) => res.map((e) => e.value));
        return result;
      },
      getRulesByGroup: async (groupId) => {
        const result = await this.sqlManager.get(
          "SELECT e.[rule_id], e.[name] FROM [ifc_bim].[rule] e " +
            "JOIN [ifc_bim].[rule_group] r ON e.[rule_id] = r.[rule_id] " +
            "WHERE r.[group_id] = ?",
          [groupId]
        );
        return result;
      },
    };
    this.updater = {
      updateRule: async (ruleId, name, formula, description, display) => {
        await this.sqlManager.update(
          "UPDATE [ifc_bim].[rule] SET [name] = ?, [formula] = ?, [description] = ?, [display] = ? WHERE [rule_id] = ?",
          [name, formula, description, display, ruleId]
        );
      },
      updateFilter: async (ruleId, filterId, index) => {
        await this.sqlManager.update(
          "UPDATE [ifc_bim].[filter] SET [index] = ? WHERE [filter_id] = ? AND [rule_id] = ?",
          [index, filterId, ruleId]
        );
      },
      updateConstraint: async (
        constraintId,
        operationId,
        onId,
        attribute,
        index
      ) => {
        await this.sqlManager.update(
          "UPDATE [ifc_bim].[constraint] SET [operation_id] = ?, [on_id] = ?, [attribute] = ?, [index] = ? WHERE [constraint_id] = ?",
          [operationId, onId, attribute, index, constraintId]
        );
      },
    };
    this.deleter = {
      unlinkRuleModelTypes: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[rule_model_type] WHERE [rule_id] = ?",
          [ruleId]
        );
      },
      unlinkRuleBuildingTypes: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[rule_building_type] WHERE [rule_id] = ?",
          [ruleId]
        );
      },
      unlinkRuleGroup: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[rule_group] WHERE [rule_id] = ?",
          [ruleId]
        );
      },
      unlinkFilterEntities: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[filter_entity] WHERE [filter_id] = ?",
          [filterId]
        );
      },
      unlinkFilterEntitiesExcluded: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[filter_entity_excluded] WHERE [filter_id] = ?",
          [filterId]
        );
      },
      unlinkFilterSpaces: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[filter_space] WHERE [filter_id] = ?",
          [filterId]
        );
      },
      deleteSpecificConstraint: async (constraintId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[pset_constraint] WHERE [constraint_id] = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[attribute_constraint] WHERE [constraint_id] = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[location_constraint] WHERE [constraint_id] = ?",
          [constraintId]
        );
      },
      deleteExpectedValues: async (constraintId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[expected_value] WHERE [constraint_id] = ?",
          [constraintId]
        );
      },
      deleteRule: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM [ifc_bim].[rule] WHERE [rule_id] = ?",
          [ruleId]
        );
      },
    };
  }
}

const testConnection = async () => {
  try {
    await db.ping();
    return true;
  } catch (error) {
    throw error;
  }
};

const manager = new Manager(db);

const getRule = async (ruleId) => {
  const result = { id: ruleId };
  try {
    const rule = await manager.getter.getRule(ruleId);
    result.name = rule.name;
    result.formula = rule.formula;
    result.description = rule.description;
    result.display = rule.display;

    const modelTypes = await manager.getter.getModelTypes(ruleId);
    result.modelTypes = modelTypes;

    const buildingTypes = await manager.getter.getBuildingTypes(ruleId);
    result.buildingTypes = buildingTypes;

    const filters = await manager.getter.getFilters(ruleId);
    const filtersArray = [];

    for await (const filter of filters) {
      const filterObject = {
        id: filter.filter_id,
        index: filter.index,
        name: filter.name,
      };

      const spaces = await manager.getter.getSpaces(filter.filter_id);
      filterObject.spaces = spaces;

      const entities = await manager.getter.getEntities(filter.filter_id);
      filterObject.entities = entities;

      const excluded = await manager.getter.getEntitiesExcluded(
        filter.filter_id
      );
      filterObject.excluded = excluded;

      const constraints = await manager.getter.getConstraints(filter.filter_id);
      const constraintsArray = [];
      for await (const constraint of constraints) {
        const psetConstraints = await db.get(
          "SELECT * FROM [ifc_bim].[pset_constraint] WHERE [constraint_id] = ?",
          [constraint.constraint_id]
        );
        const locConstraint = await db.get(
          "SELECT * FROM [ifc_bim].[location_constraint] WHERE [constraint_id] = ?",
          [constraint.constraint_id]
        );
        const attrConstraint = await db.get(
          "SELECT * FROM [ifc_bim].[attribute_constraint] WHERE [constraint_id] = ?",
          [constraint.constraint_id]
        );

        const thisConstraint = [
          ...psetConstraints.map((c) => ({
            type: "PSET_QTO",
            pset: c.name_regexp,
          })),
          ...locConstraint.map((c) => ({ type: "LOCATION" })),
          ...attrConstraint.map((c) => ({ type: "ATTRIBUTE" })),
        ];

        const values = await manager.getter.getValues(constraint.constraint_id);
        const constraintObject = {
          id: constraint.constraint_id,
          attribute: constraint.attribute,
          index: constraint.index,
          operation: constraint.op_name,
          on: constraint.on_name,
          values: values,
          ...thisConstraint[0],
        };
        constraintsArray.push(constraintObject);
      }

      filterObject.constraints = constraintsArray;
      filtersArray.push(filterObject);
    }

    result.filters = filtersArray;
    return result;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getRulesByGroupFull: async (groupId) => {
    await testConnection();

    try {
      const rules = await manager.getter.getRulesByGroup(groupId);
      const allRules = [];
      for await (const rule of rules) {
        const result = await getRule(rule.rule_id);
        allRules.push(result);
      }
      return allRules;
    } catch (error) {
      throw error;
    }
  },
  getRulesByGroupHeader: async (groupId) => {
    await testConnection();
    try {
      const rows = await manager.getter.getRulesByGroup(groupId);
      return rows;
    } catch (error) {
      throw error;
    }
  },
  getRuleHeader: async (ruleId) => {
    await testConnection();

    try {
      const rows = await manager.getter.getRule(ruleId);
      return rows;
    } catch (error) {
      throw error;
    }
  },
  getRuleFull: async (ruleId) => {
    await testConnection();
    const rule = await getRule(ruleId);
    return rule;
  },
  createRule: async (userId, data) => {
    await testConnection();

    await db.transaction();

    try {
      const ruleId = await manager.creator.newRule(
        userId,
        data.name,
        data.formula,
        data.description,
        data.display
      );

      await manager.creator.linkRuleModelTypes(ruleId, data.modelTypes);
      await manager.creator.linkRuleGroup(ruleId, data.group);
      await manager.creator.linkRuleBuildingTypes(ruleId, data.buildingTypes);

      for await (const filter of data.filters) {
        const filterId = await manager.creator.newFilter(
          ruleId,
          filter.index,
          filter.name
        );

        await manager.creator.linkFilterSpaces(filterId, filter.spaces);
        await manager.creator.linkFilterEntities(filterId, filter.entities);
        await manager.creator.linkFilterEntitiesExcluded(
          filterId,
          filter.excluded
        );

        for await (const constraint of filter.constraints) {
          const operationId = await manager.getter.getOperation(
            constraint.operation
          );
          const onId = await manager.getter.getOn(constraint.on);

          const constraintId = await manager.creator.newConstraint(
            operationId,
            onId,
            filterId,
            constraint.attribute,
            constraint.index
          );

          await manager.creator.newSpecificConstraint(constraintId, constraint);
          await manager.creator.newExpectedValues(
            constraint.values,
            constraintId
          );
        }
      }

      await db.commit();
      return ruleId;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  updateRule: async (ruleId, data) => {
    await testConnection();

    await db.transaction();

    try {
      await manager.updater.updateRule(
        ruleId,
        data.name,
        data.formula,
        data.description,
        data.display
      );

      await manager.deleter.unlinkRuleModelTypes(ruleId);
      await manager.creator.linkRuleModelTypes(ruleId, data.modelTypes);

      await manager.deleter.unlinkRuleGroup(ruleId);
      await manager.creator.linkRuleGroup(ruleId, data.group);

      await manager.deleter.unlinkRuleBuildingTypes(ruleId);
      await manager.creator.linkRuleBuildingTypes(ruleId, data.buildingTypes);

      for await (const filter of data.filters) {
        let filterId = filter.id;
        if (!!filterId) {
          await manager.updater.updateFilter(ruleId, filterId, filter.index);
          await manager.deleter.unlinkFilterEntitiesExcluded(filterId);
          await manager.deleter.unlinkFilterEntities(filterId);
          await manager.deleter.unlinkFilterSpaces(filterId);
        } else {
          filterId = await manager.creator.newFilter(
            ruleId,
            filter.index,
            filter.name
          );
        }

        await manager.creator.linkFilterSpaces(filterId, filter.spaces);
        await manager.creator.linkFilterEntities(filterId, filter.entities);
        await manager.creator.linkFilterEntitiesExcluded(
          filterId,
          filter.excluded
        );

        for await (const constraint of filter.constraints) {
          const operationId = await manager.getter.getOperation(
            constraint.operation
          );
          const onId = await manager.getter.getOn(constraint.on);
          let constraintId = constraint.id;

          if (!!constraintId) {
            await manager.updater.updateConstraint(
              constraintId,
              operationId,
              onId,
              constraint.attribute,
              constraint.index
            );

            await manager.deleter.deleteSpecificConstraint(constraintId);
            await manager.deleter.deleteExpectedValues(constraintId);
          } else {
            constraintId = await manager.creator.newConstraint(
              operationId,
              onId,
              filterId,
              constraint.attribute,
              constraint.index
            );
          }

          await manager.creator.newSpecificConstraint(constraintId, constraint);
          await manager.creator.newExpectedValues(
            constraint.values,
            constraintId
          );
        }
      }

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  deleteRule: async (ruleId) => {
    await testConnection();
    await db.transaction();

    try {
      await manager.deleter.deleteRule(ruleId);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getGroups: async () => {
    await testConnection();
    try {
      const rows = await manager.getter.getGroups();
      return rows;
    } catch (error) {
      throw error;
    }
  },
  getRegions: async () => {
    await testConnection();

    try {
      const rows = await db.get("SELECT * FROM [ifc_bim].[region]", []);
      return rows;
    } catch (error) {
      throw error;
    }
  },
  getCommunes: async (regionId) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT [commune_id], [name] FROM [ifc_bim].[commune] WHERE [region_id] = ?",
        [regionId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },
  createTender: async (userId, data) => {
    await testConnection();

    await db.transaction();

    try {
      const buildingType = await db.get(
        "SELECT [building_type_id] FROM [ifc_bim].[building_type] WHERE [name] = ?",
        [data.type]
      );

      const tenderId = await db.insert(
        "INSERT INTO [ifc_bim].[tender](" +
          "[name],[commune_id],[address],[property_role],[constructability_coef]," +
          "[upper_floors_coef],[total_units],[parking_lots],[building_height]," +
          "[soil_occupancy_coef],[building_type_id],[angle],[vulnerable],[handicap_vulnerable]," +
          "[medios_1],[handicap_medios_1],[medios_2],[handicap_medios_2],[total], [created_by]) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          data.name,
          data.commune,
          data.address,
          data.propertyRole,
          data.constructabilityCoef,
          data.upperFloorsCoef,
          data.totalUnits,
          data.parkingLots,
          data.buildingHeight,
          data.soilOccupancyCoef,
          buildingType[0].building_type_id,
          data.angle,
          data.vulnerable,
          data.isHandicapVulnerable ? data.handicapVulnerable : 0,
          data.medios1,
          data.isHandicapMedios1 ? data.handicapMedios1 : 0,
          data.medios2,
          data.isHandicapMedios2 ? data.handicapMedios2 : 0,
          data.total,
          userId,
        ]
      );

      await db.commit();
      return tenderId;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getTenders: async (userId) => {
    await testConnection();

    try {
      const region = await db.get(
        "SELECT [region_id] FROM [ifc_bim].[user] WHERE [user_id] = ?",
        [userId]
      );

      if (region.length > 0) {
        const rows = await db.get(
          "SELECT t.[tender_id], t.[name] FROM [ifc_bim].[tender] t " +
            "JOIN [ifc_bim].[commune] r ON t.[commune_id] = r.[commune_id] " +
            "WHERE r.[region_id] = ?",
          [region[0].region_id]
        );
        return rows;
      } else {
        const rows = await db.get(
          "SELECT [tender_id], [name] FROM [ifc_bim].[tender]",
          []
        );
        return rows;
      }
    } catch (error) {
      throw error;
    }
  },
  getTender: async (tenderId) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT t.*, r.[name] building_type_name, s.[region_id] FROM [ifc_bim].[tender] t " +
          "JOIN [ifc_bim].[building_type] r ON t.[building_type_id] = r.[building_type_id] " +
          "JOIN [ifc_bim].[commune] s ON t.[commune_id] = s.[commune_id] " +
          "WHERE [tender_id] = ?",
        [tenderId]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },
  getTendersUser: async (userId) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT [tender_id], [name] FROM [ifc_bim].[tender] WHERE [created_by] = ?",
        [userId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },
  getRulesUser: async (userId) => {
    await testConnection();

    try {
      const rows = await db.get(
        "SELECT [rule_id], [name] FROM [ifc_bim].[rule] WHERE [created_by] = ?",
        [userId]
      );
      return rows;
    } catch (error) {
      throw error;
    }
  },
  removeTender: async (tenderId) => {
    await testConnection();
    await db.transaction();

    try {
      await db.delete("DELETE FROM [ifc_bim].[tender] WHERE [tender_id] = ?", [
        tenderId,
      ]);
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  updateTender: async (tenderId, data) => {
    await testConnection();

    await db.transaction();

    try {
      const buildingType = await db.get(
        "SELECT [building_type_id] FROM [ifc_bim].[building_type] WHERE [name] = ?",
        [data.type]
      );

      await db.update(
        "UPDATE [ifc_bim].[tender] SET " +
          "[name] = ?, [commune_id] = ?, [address] = ?, [property_role] = ?, [constructability_coef] = ?, " +
          "[soil_occupancy_coef] = ?, [building_type_id] = ?, [angle] = ?, [vulnerable] = ?, [handicap_vulnerable] = ?, " +
          "[medios_1] = ?, [handicap_medios_1] = ?, [medios_2] = ?, [handicap_medios_2] = ?, [total] = ?, " +
          "[upper_floors_coef] = ?, [total_units] = ?, [parking_lots] = ?, [building_height] = ? " +
          "WHERE [tender_id] = ?",
        [
          data.name,
          data.commune,
          data.address,
          data.propertyRole,
          data.constructabilityCoef,
          data.soilOccupancyCoef,
          buildingType[0].building_type_id,
          data.angle,
          data.vulnerable,
          data.isHandicapVulnerable ? data.handicapVulnerable : 0,
          data.medios1,
          data.isHandicapMedios1 ? data.handicapMedios1 : 0,
          data.medios2,
          data.isHandicapMedios2 ? data.handicapMedios2 : 0,
          data.total,
          data.upperFloorsCoef,
          data.totalUnits,
          data.parkingLots,
          data.buildingHeight,
          tenderId,
        ]
      );

      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  createGroup: async (groupName) => {
    await testConnection();

    await db.transaction();

    try {
      const groupId = await db.insert(
        "INSERT INTO [ifc_bim].[group]([name]) VALUES (?)",
        [groupName]
      );
      await db.commit();
      return groupId;
    } catch (error) {
      await db.rollback();
      throw error;
    }
  },
  getEntities: async () => {
    await testConnection();

    try {
      const rows = await db.get("SELECT [name] FROM [ifc_bim].[entity]", []);
      return rows;
    } catch (error) {
      throw error;
    }
  },
};
