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

const getRule = async (data, callback) => {
  let result = {};
  try {
    const rules = await db.get(
      "SELECT `name`, `formula` FROM `rule` WHERE `rule_id` = ?",
      [data.ruleId]
    );
    result.name = rules[0].name;
    result.formula = rules[0].formula;
    result.id = data.ruleId;

    const filters = await db.get(
      "SELECT `filter_id`, `index`, `space_name` FROM `filter` WHERE `rule_id` = ?",
      [data.ruleId]
    );
    const filtersArray = [];

    for await (const filter of filters) {
      const filterObject = { id: filter.filter_id, index: filter.index };
      filterObject.scope = !!filter.space_name ? "space" : "global";
      if (!!filter.space_name) filterObject.space = filter.space_name;

      const entities = await db.get(
        "SELECT e.`name` FROM `entity` e " +
          "JOIN `filter_entity` r ON e.`entity_id` = r.`entity_id` " +
          "WHERE r.`filter_id` = ?",
        [filter.filter_id]
      );
      filterObject.entities = entities.map((entity) => entity.name);

      const constraintsArray = [];

      const constraints = await db.get(
        "SELECT c.`constraint_id`, c.`operation_id`, c.`on_id`, c.`attribute`, c.`index`, r.`name` op_name, s.`name` on_name " +
          "FROM `constraint` c " +
          "JOIN `operation` r ON r.`operation_id` = c.`operation_id` " +
          "JOIN `on` s ON s.`on_id` = c.`on_id` " +
          "WHERE c.`filter_id` = ?",
        [filter.filter_id]
      );

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
            type: "pset",
            pset: c.name_regexp,
          })),
          ...locConstraint.map((c) => ({ type: "location" })),
          ...attrConstraint.map((c) => ({ type: "attribute" })),
        ];
        const constraintObject = {
          id: constraint.constraint_id,
          attribute: constraint.attribute,
          index: constraint.index,
          operation: constraint.op_name,
          on: constraint.on_name,
          ...thisConstraint[0],
        };

        const valuesInt = await db.get(
          "SELECT `value` FROM `expected_value_int` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const valuesFloat = await db.get(
          "SELECT `value` FROM `expected_value_float` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const valuesStr = await db.get(
          "SELECT `value` FROM `expected_value_string` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );

        const values = [
          ...valuesInt.map((v) => v.value),
          ...valuesFloat.map((v) => v.value),
          ...valuesStr.map((v) => v.value),
        ];

        if (values.length > 0) constraintObject.values = values;
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

class Manager {
  constructor(sqlManager) {
    this.sqlManager = sqlManager;
    this.creator = {
      newRule: async (name, formula) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO `rule` (`name`, `formula`) VALUES (?, ?)",
          [name, formula]
        );
        return result;
      },
      linkRuleGroup: async (ruleId, groupId) => {
        await this.sqlManager.insert(
          "INSERT INTO `rule_group` (`rule_id`, `group_id`) VALUES (?, ?)",
          [ruleId, groupId]
        );
      },
      newFilter: async (ruleId, spaceName, index) => {
        const result = await this.sqlManager.insert(
          "INSERT INTO `filter` (`rule_id`, `space_name`, `index`) VALUES (?, ?, ?)",
          [ruleId, spaceName, index]
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
            const result3 = await this.sqlManager.insert(
              "INSERT INTO `entity` (`name`) VALUES (?)",
              [entity]
            );
            entityId = result3;
          }

          await this.sqlManager.insert(
            "INSERT INTO `filter_entity` (`filter_id`, `entity_id`) VALUES (?, ?)",
            [filterId, entityId]
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
        if (constraintSpecification.type === "pset") {
          await this.sqlManager.insert(
            "INSERT INTO `pset_constraint` (`constraint_id`, `name_regexp`) VALUES (?, ?)",
            [constraintId, constraintSpecification.pset]
          );
        } else if (constraintSpecification.type === "location") {
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
          if (/^\d+$/.test(value)) {
            await this.sqlManager.insert(
              "INSERT INTO `expected_value_int` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, parseInt(value)]
            );
          } else if (/^\d+\.\d+$/.test(value)) {
            await this.sqlManager.insert(
              "INSERT INTO `expected_value_float` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, parseFloat(value)]
            );
          } else {
            await this.sqlManager.insert(
              "INSERT INTO `expected_value_string` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, value]
            );
          }
        }
      },
    };
    this.getter = {
      getOperation: async (name) => {
        const operations = await this.sqlManager.get(
          "SELECT `operation_id` FROM `operation` WHERE `name` = ?",
          [name]
        );
        try {
          return operations[0].operation_id;
        } catch {
          return -1;
        }
      },
      getOn: async (name) => {
        const ons = await this.sqlManager.get(
          "SELECT `on_id` FROM `on` WHERE `name` = ?",
          [name]
        );
        try {
          return ons[0].on_id;
        } catch {
          return -1;
        }
      },
    };
    this.updater = {
      updateRule: async (ruleId, name, formula) => {
        await this.sqlManager.update(
          "UPDATE `rule` SET `name` = ?, `formula` = ?  WHERE `rule_id` = ?",
          [name, formula, ruleId]
        );
      },
      updateFilter: async (ruleId, filterId, spaceName, index) => {
        await this.sqlManager.update(
          "UPDATE `filter` SET `space_name` = ?, `index` = ? WHERE `filter_id` = ? AND `rule_id` = ?",
          [spaceName, index, filterId, ruleId]
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
      unlinkFilterEntities: async (filterId) => {
        await this.sqlManager.delete(
          "DELETE FROM `filter_entity` WHERE `filter_id` = ?",
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
          "DELETE FROM `expected_value_int` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM `expected_value_float` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.sqlManager.delete(
          "DELETE FROM `expected_value_string` WHERE `constraint_id` = ?",
          [constraintId]
        );
      },
    };
  }
}

module.exports = {
  getAllRules: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rules = await db.get(
        "SELECT g.`rule_id` FROM `rule` r JOIN `rule_group` g ON r.`rule_id` = g.`rule_id` WHERE g.`group_id` = ?",
        [data.groupId]
      );
      const allRules = [];
      for await (const rule of rules) {
        await getRule({ ruleId: rule.rule_id }, (err, result) => {
          if (err) throw err;
          allRules.push(result);
        });
      }
      callback(null, allRules);
    } catch (error) {
      callback(error);
    }
  },
  getRules: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await db.get(
        "SELECT g.`rule_id`, r.`name` FROM `rule` r JOIN `rule_group` g ON r.`rule_id` = g.`rule_id` WHERE g.`group_id` = ?",
        [data.groupId]
      );
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRuleBasicInfo: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    try {
      const rows = await db.get(
        "SELECT `formula`, `name` FROM `rule` WHERE `rule_id` = ?",
        [data.ruleId]
      );
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
  getRule: (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }
    return getRule(data, callback);
  },
  createRule: async (data, callback) => {
    if (!testConnection()) {
      callback(true);
      return;
    }

    const t = await db.transaction();
    const manager = new Manager(db);

    try {
      const ruleId = await manager.creator.newRule(data.name, data.formula);

      await manager.creator.linkRuleGroup(ruleId, data.groupId);

      for await (const filter of data.filters) {
        const filterId = await manager.creator.newFilter(
          ruleId,
          filter.scope === "space" ? filter.space : null,
          filter.index
        );

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

          !!constraint.values &&
            (await manager.creator.newExpectedValues(
              constraint.values,
              constraintId
            ));
        }
      }

      await t.commit();
      callback(null);
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
    const manager = new Manager(db);

    try {
      await manager.updater.updateRule(ruleId, data.name, data.formula);

      for await (const filter of data.filters) {
        let filterId = filter.id;
        if (!!filterId) {
          await manager.updater.updateFilter(
            ruleId,
            filterId,
            filter.scope === "space" ? filter.space : null,
            filter.index
          );
          await manager.deleter.unlinkFilterEntities(filterId);
        } else {
          filterId = await manager.creator.newFilter(
            ruleId,
            filter.scope === "space" ? filter.space : null,
            filter.index
          );
        }

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

          !!constraint.values &&
            (await manager.creator.newExpectedValues(
              constraint.values,
              constraintId
            ));
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
      const rows = await db.get("DELETE FROM `rule` WHERE `rule_id` = ?", [
        ruleId,
      ]);
      callback(null, rows);
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
      const rows = await db.get("SELECT * FROM `group`", []);
      callback(null, rows);
    } catch (error) {
      callback(error);
    }
  },
};
