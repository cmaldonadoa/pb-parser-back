const SqlManager = require("./sqlmanager");

const db = new SqlManager();

class Manager {
  constructor(sqlManager) {
    this.sqlManager = sqlManager;
    this.creator = {
      newRule: async (userId, name, formula, description) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO `rule` (`name`, `formula`, `description`, `created_by`) VALUES (?, ?, ?, ?)",
          [name, formula, description, userId]
        );
        return result;
      },
      linkRuleGroup: async (ruleId, groupId) => {
        await this.sqlManager.insert(
          "INSERT INTO `rule_group` (`rule_id`, `group_id`) VALUES (?, ?)",
          [ruleId, groupId]
        );
      },
      linkRuleModelTypes: async (ruleId, modelTypesList) => {
        for await (const modelType of modelTypesList) {
          const modelTypeId = await this.sqlManager
            .get("SELECT `model_type_id` FROM `model_type` WHERE `name` = ?", [
              modelType,
            ])
            .then((res) => res[0].model_type_id);

          await this.sqlManager.insert(
            "INSERT INTO `rule_model_type` (`rule_id`, `model_type_id`) VALUES (?, ?)",
            [ruleId, modelTypeId]
          );
        }
      },
      newFilter: async (ruleId, index, name) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO `filter` (`rule_id`, `index`, `name`) VALUES (?, ?, ?)",
          [ruleId, index, name]
        );
        return result;
      },
      linkFilterEntities: async (filterId, entitiesList) => {
        for await (const entity of entitiesList) {
          let entityId = null;
          const entities = await this.sqlManager.get(
            "SELECT `entity_id` FROM `entity` WHERE `name` = ?",
            [entity]
          );
          if (entities.length > 0) {
            entityId = entities[0].entity_id;
          } else {
            const result = await this.sqlManager.insert(
              "INSERT INTO `entity` (`name`) VALUES (?)",
              [entity]
            );
            entityId = result;
          }

          await this.sqlManager.insert(
            "INSERT INTO `filter_entity` (`filter_id`, `entity_id`) VALUES (?, ?)",
            [filterId, entityId]
          );
        }
      },
      linkFilterSpaces: async (filterId, spacesList) => {
        for await (const space of spacesList) {
          let spaceId = null;
          const spaces = await this.sqlManager.get(
            "SELECT `space_id` FROM `space` WHERE `name` = ?",
            [space]
          );
          if (spaces.length > 0) {
            spaceId = spaces[0].space_id;
          } else {
            const result = await this.sqlManager.insert(
              "INSERT INTO `space` (`name`) VALUES (?)",
              [space]
            );
            spaceId = result;
          }

          await this.sqlManager.insert(
            "INSERT INTO `filter_space` (`filter_id`, `space_id`) VALUES (?, ?)",
            [filterId, spaceId]
          );
        }
      },
      newConstraint: async (operationId, onId, filterId, attribute, index) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO `constraint` (`operation_id`, `on_id`, `filter_id`, `attribute`, `index`) VALUES (?, ?, ?, ?, ?)",
          [operationId, onId, filterId, attribute, index]
        );
        return result;
      },
      newSpecificConstraint: async (constraintId, constraintSpecification) => {
        if (constraintSpecification.type === "PSET_QTO") {
          await this.sqlManager.insert(
            "INSERT INTO `pset_constraint` (`constraint_id`, `name_regexp`) VALUES (?, ?)",
            [constraintId, constraintSpecification.pset]
          );
        } else if (constraintSpecification.type === "LOCATION") {
          await this.sqlManager.insert(
            "INSERT INTO `location_constraint` (`constraint_id`) VALUES (?)",
            [constraintId]
          );
        } else {
          await this.sqlManager.insert(
            "INSERT INTO `attribute_constraint` (`constraint_id`) VALUES (?)",
            [constraintId]
          );
        }
      },
      newExpectedValues: async (valuesList, constraintId) => {
        for await (const value of valuesList) {
          await this.sqlManager.insert(
            "INSERT INTO `expected_value` (`constraint_id`, `value`) VALUES (?, ?)",
            [constraintId, value.toString()]
          );
        }
      },
    };
    this.getter = {
      getGroups: async () => {
        const result = await this.sqlManager.get("SELECT * FROM `group`");
        return result;
      },
      getOperation: async (name) => {
        const result = await this.sqlManager
          .get("SELECT `operation_id` FROM `operation` WHERE `name` = ?", [
            name,
          ])
          .then((res) => res[0].operation_id)
          .catch((err) => -1);
        return result;
      },
      getOn: async (name) => {
        const result = await this.sqlManager
          .get("SELECT `on_id` FROM `on` WHERE `name` = ?", [name])
          .then((res) => res[0].on_id)
          .catch((err) => -1);
        return result;
      },
      getRule: async (ruleId) => {
        const result = await this.sqlManager
          .get(
            "SELECT `name`, `formula`, `description` FROM `rule` WHERE `rule_id` = ?",
            [ruleId]
          )
          .then((res) => res[0])
          .catch((err) => ({}));
        return result;
      },
      getModelTypes: async (ruleId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.`name` FROM `model_type` e " +
              "JOIN `rule_model_type` r ON e.`model_type_id` = r.`model_type_id` " +
              "WHERE r.`rule_id` = ?",
            [ruleId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getFilters: async (ruleId) => {
        const result = await this.sqlManager.get(
          "SELECT `filter_id`, `index`, `name` FROM `filter` WHERE `rule_id` = ?",
          [ruleId]
        );
        return result;
      },
      getSpaces: async (filterId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.`name` FROM `space` e " +
              "JOIN `filter_space` r ON e.`space_id` = r.`space_id` " +
              "WHERE r.`filter_id` = ?",
            [filterId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getEntities: async (filterId) => {
        const result = await this.sqlManager
          .get(
            "SELECT e.`name` FROM `entity` e " +
              "JOIN `filter_entity` r ON e.`entity_id` = r.`entity_id` " +
              "WHERE r.`filter_id` = ?",
            [filterId]
          )
          .then((res) => res.map((e) => e.name));
        return result;
      },
      getConstraints: async (filterId) => {
        const result = await this.sqlManager.get(
          "SELECT c.`constraint_id`, c.`operation_id`, c.`on_id`, c.`attribute`, c.`index`, r.`name` op_name, s.`name` on_name " +
            "FROM `constraint` c " +
            "JOIN `operation` r ON r.`operation_id` = c.`operation_id` " +
            "JOIN `on` s ON s.`on_id` = c.`on_id` " +
            "WHERE c.`filter_id` = ?",
          [filterId]
        );
        return result;
      },
      getValues: async (constraintId) => {
        const result = await this.sqlManager
          .get(
            "SELECT `value` FROM `expected_value` WHERE `constraint_id` = ?",
            [constraintId]
          )
          .then((res) => res.map((e) => e.value));
        return result;
      },
      getRulesByGroup: async (groupId) => {
        const result = await this.sqlManager.get(
          "SELECT e.`rule_id`, e.`name` FROM `rule` e " +
            "JOIN `rule_group` r ON e.`rule_id` = r.`rule_id` " +
            "WHERE r.`group_id` = ?",
          [groupId]
        );
        return result;
      },
    };
    this.updater = {
      updateRule: async (ruleId, name, formula, description) => {
        await this.sqlManager.update(
          "UPDATE `rule` SET `name` = ?, `formula` = ?, `description` = ? WHERE `rule_id` = ?",
          [name, formula, description, ruleId]
        );
      },
      updateFilter: async (ruleId, filterId, index) => {
        await this.sqlManager.update(
          "UPDATE `filter` SET `index` = ? WHERE `filter_id` = ? AND `rule_id` = ?",
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
          "UPDATE `constraint` SET `operation_id` = ?, `on_id` = ?, `attribute` = ?, `index` = ? WHERE `constraint_id` = ?",
          [operationId, onId, attribute, index, constraintId]
        );
      },
    };
    this.deleter = {
      unlinkRuleModelTypes: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM `rule_model_type` WHERE `rule_id` = ?",
          [ruleId]
        );
      },
      unlinkRuleGroup: async (ruleId) => {
        await this.sqlManager.delete(
          "DELETE FROM `rule_group` WHERE `rule_id` = ?",
          [ruleId]
        );
      },
      unlinkFilterEntities: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM `filter_entity` WHERE `filter_id` = ?",
          [filterId]
        );
      },
      unlinkFilterSpaces: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM `filter_space` WHERE `filter_id` = ?",
          [filterId]
        );
      },
      deleteSpecificConstraint: async (constraintId) => {
        await this.sqlManager.delete(
          "DELETE FROM `pset_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM `attribute_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM `location_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
      },
      deleteExpectedValues: async (constraintId) => {
        await this.sqlManager.delete(
          "DELETE FROM `expected_value` WHERE `constraint_id` = ?",
          [constraintId]
        );
      },
      deleteRule: async (ruleId) => {
        await this.sqlManager.delete("DELETE FROM `rule` WHERE `rule_id` = ?", [
          ruleId,
        ]);
      },
    };
  }
}

const testConnection = async () => {
  try {
    await db.ping();
    return true;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    return false;
  }
};

const manager = new Manager(db);

const getRule = async (ruleId, callback) => {
  const result = { id: ruleId };
  try {
    const rule = await manager.getter.getRule(ruleId);
    result.name = rule.name;
    result.formula = rule.formula;
    result.description = rule.description;

    const modelTypes = await manager.getter.getModelTypes(ruleId);
    result.modelTypes = modelTypes;

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

      const constraints = await manager.getter.getConstraints(filter.filter_id);
      const constraintsArray = [];
      for await (const constraint of constraints) {
        const psetConstraints = await db.get(
          "SELECT * FROM `pset_constraint` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const locConstraint = await db.get(
          "SELECT * FROM `location_constraint` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const attrConstraint = await db.get(
          "SELECT * FROM `attribute_constraint` WHERE `constraint_id` = ?",
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
    callback(null, result);
  } catch (error) {
    callback(error);
  }
};

module.exports = {
  getRulesByGroupFull: async (groupId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rules = await manager.getter.getRulesByGroup(groupId);
      const allRules = [];
      for await (const rule of rules) {
        await getRule(rule.rule_id, (err, result) => {
          if (err) throw err;
          allRules.push(result);
        });
      }
      callback(null, allRules);
    } catch (error) {
      callback(error);
    }
  },
  getRulesByGroupHeader: async (groupId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await manager.getter.getRulesByGroup(groupId);
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRuleHeader: async (ruleId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await manager.getter.getRule(ruleId);
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRuleFull: (ruleId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    return getRule(ruleId, callback);
  },
  createRule: async (userId, data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    const t = await db.transaction();

    try {
      const ruleId = await manager.creator.newRule(
        userId,
        data.name,
        data.formula,
        data.description
      );

      await manager.creator.linkRuleModelTypes(ruleId, data.modelTypes);
      await manager.creator.linkRuleGroup(ruleId, data.group);

      for await (const filter of data.filters) {
        const filterId = await manager.creator.newFilter(
          ruleId,
          filter.index,
          filter.name
        );

        await manager.creator.linkFilterSpaces(filterId, filter.spaces);
        await manager.creator.linkFilterEntities(filterId, filter.entities);

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

      await t.commit();
      callback(null, ruleId);
    } catch (error) {
      await t.rollback();
      callback(error);
    }
  },
  updateRule: async (ruleId, data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    const t = await db.transaction();

    try {
      await manager.updater.updateRule(
        ruleId,
        data.name,
        data.formula,
        data.description
      );

      await manager.deleter.unlinkRuleModelTypes(ruleId);
      await manager.creator.linkRuleModelTypes(ruleId, data.modelTypes);

      await manager.deleter.unlinkRuleGroup(ruleId);
      await manager.creator.linkRuleGroup(ruleId, data.group);

      for await (const filter of data.filters) {
        let filterId = filter.id;
        if (!!filterId) {
          await manager.updater.updateFilter(ruleId, filterId, filter.index);
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

      await t.commit();
      callback(null);
    } catch (error) {
      await t.rollback();
      callback(error);
    }
  },
  deleteRule: async (ruleId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      await manager.deleter.deleteRule(ruleId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  },
  getGroups: async (callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await manager.getter.getGroups();
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRegions: async (callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get("SELECT * FROM `region`", []);
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getCommunes: async (regionId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get(
        "SELECT `commune_id`, `name` FROM `commune` WHERE `region_id` = ?",
        [regionId]
      );
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },

  createTender: async (userId, data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const buildingType = await db.get(
        "SELECT `building_type_id` FROM `building_type` WHERE `name` = ?",
        [data.type]
      );

      const tenderId = await db.insert(
        "INSERT INTO `tender`(" +
          "`name`,`region_id`,`commune_id`,`address`,`propertyRole`,`constructabilityCoef`," +
          "`soilOccupancyCoef`,`building_type_id`,`angle`,`vulnerable`,`handicapVulnerable`," +
          "`medios1`,`handicapMedios1`,`medios2`,`handicapMedios2`,`total`, `created_by`) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          data.name,
          data.region,
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
          userId,
        ]
      );

      callback(null, tenderId);
    } catch (error) {
      callback(error);
    }
  },
  getTenders: async (callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get("SELECT `tender_id`, `name` FROM `tender`", []);
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },

  getTender: async (tenderId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get(
        "SELECT t.*, r.`name` building_type_name FROM `tender` t JOIN `building_type` r ON t.`building_type_id` = r.`building_type_id` WHERE `tender_id` = ?",
        [tenderId]
      );
      callback(null, rows[0]);
    } catch (error) {
      callback(error);
    }
  },
  getTendersUser: async (userId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get(
        "SELECT `tender_id`, `name` FROM `tender` WHERE `created_by` = ?",
        [userId]
      );
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRulesUser: async (userId, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    try {
      const rows = await db.get(
        "SELECT `rule_id`, `name` FROM `rule` WHERE `created_by` = ?",
        [userId]
      );
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
};
