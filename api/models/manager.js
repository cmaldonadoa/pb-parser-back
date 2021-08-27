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

const getRule = async (data, callback) => {
  let result = {};
  let connection = null;

  try {
    connection = await pool.getConnection();
    const [rules, _1] = await connection.execute(
      "SELECT `name`, `formula` FROM `rule` WHERE `rule_id` = ?",
      [data.ruleId]
    );
    result.name = rules[0].name;
    result.formula = rules[0].formula;
    result.id = data.ruleId;

    const [filters, _2] = await connection.execute(
      "SELECT `filter_id`, `index`, `space_name` FROM `filter` WHERE `rule_id` = ?",
      [data.ruleId]
    );
    const filtersArray = [];

    for await (const filter of filters) {
      const filterObject = { id: filter.filter_id, index: filter.index };
      filterObject.scope = !!filter.space_name ? "space" : "global";
      if (!!filter.space_name) filterObject.space = filter.space_name;

      const [entities, _3] = await connection.execute(
        "SELECT e.`name` FROM `entity` e " +
          "JOIN `filter_entity` r ON e.`entity_id` = r.`entity_id` " +
          "WHERE r.`filter_id` = ?",
        [filter.filter_id]
      );
      filterObject.entities = entities.map((entity) => entity.name);

      const constraintsArray = [];

      const [constraints, _4] = await connection.execute(
        "SELECT c.`constraint_id`, c.`operation_id`, c.`on_id`, c.`attribute`, c.`index`, r.`name` op_name, s.`name` on_name " +
          "FROM `constraint` c " +
          "JOIN `operation` r ON r.`operation_id` = c.`operation_id` " +
          "JOIN `on` s ON s.`on_id` = c.`on_id` " +
          "WHERE c.`filter_id` = ?",
        [filter.filter_id]
      );

      for await (const constraint of constraints) {
        const [psetConstraints, _4] = await connection.execute(
          "SELECT * FROM `pset_constraint` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const [locConstraint, _5] = await connection.execute(
          "SELECT * FROM `location_constraint` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const [attrConstraint, _6] = await connection.execute(
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

        const [valuesInt, _8] = await connection.execute(
          "SELECT `value` FROM `expected_value_int` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const [valuesFloat, _9] = await connection.execute(
          "SELECT `value` FROM `expected_value_float` WHERE `constraint_id` = ?",
          [constraint.constraint_id]
        );
        const [valuesStr, _10] = await connection.execute(
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
  } finally {
    if (connection) connection.release();
  }
};

class Manager {
  constructor(connection) {
    this.connection = connection;
    this.creator = {
      newRule: async (name, formula) => {
        const [result, _] = await this.connection.execute(
          "INSERT INTO `rule` (`name`, `formula`) VALUES (?, ?)",
          [name, formula]
        );
        return result.insertId;
      },
      linkRuleGroup: async (ruleId, groupId) => {
        await this.connection.execute(
          "INSERT INTO `rule_group` (`rule_id`, `group_id`) VALUES (?, ?)",
          [ruleId, groupId]
        );
      },
      newFilter: async (ruleId, spaceName, index) => {
        const [result, _] = await this.connection.execute(
          "INSERT INTO `filter` (`rule_id`, `space_name`, `index`) VALUES (?, ?, ?)",
          [ruleId, spaceName, index]
        );
        return result.insertId;
      },
      linkFilterEntities: async (filterId, entitiesList) => {
        for await (const entity of entitiesList) {
          let entityId = null;
          const [entities, _3] = await this.connection.execute(
            "SELECT `entity_id` FROM `entity` WHERE `name` = ?",
            [entity]
          );
          if (entities.length > 0) {
            entityId = entities[0].entity_id;
          } else {
            const [result3, _4] = await this.connection.execute(
              "INSERT INTO `entity` (`name`) VALUES (?)",
              [entity]
            );
            entityId = result3.insertId;
          }

          await this.connection.execute(
            "INSERT INTO `filter_entity` (`filter_id`, `entity_id`) VALUES (?, ?)",
            [filterId, entityId]
          );
        }
      },
      newConstraint: async (operationId, onId, filterId, attribute, index) => {
        const [result, _] = await this.connection.execute(
          "INSERT INTO `constraint` (`operation_id`, `on_id`, `filter_id`, `attribute`, `index`) VALUES (?, ?, ?, ?, ?)",
          [operationId, onId, filterId, attribute, index]
        );
        return result.insertId;
      },
      newSpecificConstraint: async (constraintId, constraintSpecification) => {
        if (constraintSpecification.type === "pset") {
          await this.connection.execute(
            "INSERT INTO `pset_constraint` (`constraint_id`, `name_regexp`) VALUES (?, ?)",
            [constraintId, constraintSpecification.pset]
          );
        } else if (constraintSpecification.type === "location") {
          await this.connection.execute(
            "INSERT INTO `location_constraint` (`constraint_id`) VALUES (?)",
            [constraintId]
          );
        } else {
          await this.connection.execute(
            "INSERT INTO `attribute_constraint` (`constraint_id`) VALUES (?)",
            [constraintId]
          );
        }
      },
      newExpectedValues: async (valuesList, constraintId) => {
        for await (const value of valuesList) {
          if (/^\d+$/.test(value)) {
            await this.connection.execute(
              "INSERT INTO `expected_value_int` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, parseInt(value)]
            );
          } else if (/^\d+\.\d+$/.test(value)) {
            await this.connection.execute(
              "INSERT INTO `expected_value_float` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, parseFloat(value)]
            );
          } else {
            await this.connection.execute(
              "INSERT INTO `expected_value_string` (`constraint_id`, `value`) VALUES (?, ?)",
              [constraintId, value]
            );
          }
        }
      },
    };
    this.getter = {
      getOperation: async (name) => {
        const [operations, _5] = await this.connection.execute(
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
        const [ons, _6] = await this.connection.execute(
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
        await this.connection.execute(
          "UPDATE `rule` SET `name` = ?, `formula` = ?  WHERE `rule_id` = ?",
          [name, formula, ruleId]
        );
      },
      updateFilter: async (ruleId, filterId, spaceName, index) => {
        await this.connection.execute(
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
        await this.connection.execute(
          "UPDATE `constraint` SET `operation_id` = ?, `on_id` = ?, `attribute` = ?, `index` = ? WHERE `constraint_id` = ?",
          [operationId, onId, attribute, index, constraintId]
        );
      },
    };
    this.deleter = {
      unlinkFilterEntities: async (filterId) => {
        await this.connection.execute(
          "DELETE FROM `filter_entity` WHERE `filter_id` = ?",
          [filterId]
        );
      },
      deleteSpecificConstraint: async (constraintId) => {
        await this.connection.execute(
          "DELETE FROM `pset_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.connection.execute(
          "DELETE FROM `attribute_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.connection.execute(
          "DELETE FROM `location_constraint` WHERE `constraint_id` = ?",
          [constraintId]
        );
      },
      deleteExpectedValues: async (constraintId) => {
        await this.connection.execute(
          "DELETE FROM `expected_value_int` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.connection.execute(
          "DELETE FROM `expected_value_float` WHERE `constraint_id` = ?",
          [constraintId]
        );
        await this.connection.execute(
          "DELETE FROM `expected_value_string` WHERE `constraint_id` = ?",
          [constraintId]
        );
      },
    };
  }
}

module.exports = {
  getAllRules: async (data, callback) => {
    let connection = null;
    try {
      connection = await pool.getConnection();
      const [rules, _] = await connection.execute(
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
    } finally {
      if (connection) connection.release();
    }
  },
  getRules: (data, callback) =>
    simpleQuery(
      "SELECT g.`rule_id`, r.`name` FROM `rule` r JOIN `rule_group` g ON r.`rule_id` = g.`rule_id` WHERE g.`group_id` = ?",
      [data.groupId],
      callback
    ),
  getRuleBasicInfo: (data, callback) =>
    simpleQuery(
      "SELECT `formula`, `name` FROM `rule` WHERE `rule_id` = ?",
      [data.ruleId],
      callback
    ),
  getRule: getRule,
  createRule: async (data, callback) => {
    let connection = null;

    try {
      connection = await pool.getConnection();
      const manager = new Manager(connection);
      await connection.beginTransaction();

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

      await connection.commit();
      callback(null);
    } catch (error) {
      if (connection) await connection.rollback();
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
  updateRule: async (ruleId, data, callback) => {
    let connection = null;

    try {
      connection = await pool.getConnection();
      const manager = new Manager(connection);
      await connection.beginTransaction();

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

      await connection.commit();
      callback(null);
    } catch (error) {
      if (connection) await connection.rollback();
      callback(error);
    } finally {
      if (connection) connection.release();
    }
  },
  deleteRule: (ruleId, callback) =>
    simpleQuery("DELETE FROM `rule` WHERE `rule_id` = ?", [ruleId], callback),
  getGroups: (callback) => simpleQuery("SELECT * FROM `group`", [], callback),
};
