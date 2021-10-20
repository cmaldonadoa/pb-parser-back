var exec = require("child_process").execSync;
const model = require("../models/manager.js");

module.exports = {
  createRule: async (req, res) => {
    try {
      const ruleId = await model.createRule(req.userId, req.body);
      res.status(200).json({ status: 200, ruleId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  updateRule: async (req, res) => {
    const ruleId = req.params.rule;
    try {
      await model.updateRule(ruleId, req.body);
      res.status(200).json({ status: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchRules: async (req, res) => {
    const groupId = req.params.group;
    try {
      const data = await model.getRulesByGroupHeader(parseInt(groupId));
      res.status(200).json({ status: 200, rules: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchRule: async (req, res) => {
    const ruleId = req.params.rule;
    try {
      const data = await model.getRuleFull(parseInt(ruleId));
      res.status(200).json({ status: 200, rule: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  deleteRule: async (req, res) => {
    const ruleId = req.params.rule;
    try {
      await model.deleteRule(ruleId);
      res.status(200).json({ status: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  parseFormula: async (req, res) => {
    const formula = req.body.formula;

    try {
      const buffer = exec(
        `python3 ${__dirname}/../../py/formula_parser.py "${formula}"`
      );
      res.status(200).json({ status: 200, latex: buffer.toString() });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  createRuleMultiple: async (req, res) => {
    const rules = req.body.rules;
    const groupId = req.body.group;

    try {
      for await (const rule of rules) {
        rule.group = groupId;
        rule.modelTypes = ["ARQUITECTURA", "VOLUMETRICO", "SITIO"];
        rule.filters = rule.filters.map((f, i) => ({
          ...f,
          index: i,
          name: "p" + i,
          spaces: f.spaces || [],
          constraints: f.constraints.map((c, j) => ({
            ...c,
            index: j,
            values: c.values || [],
          })),
        }));

        await model.createRule(req.userId, rule);
      }
      res.status(200).json({ status: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchGroups: async (req, res) => {
    try {
      const data = await model.getGroups();
      res.status(200).json({ status: 200, groups: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  fetchRegions: async (req, res) => {
    try {
      const data = await model.getRegions();
      res.status(200).json({ status: 200, regions: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchCommunes: async (req, res) => {
    try {
      const data = await model.getCommunes();
      res.status(200).json({ status: 200, communes: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  createTender: async (req, res) => {
    try {
      const tenderId = await model.createTender(req.userId, req.body);
      res.status(200).json({ status: 200, tenderId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  fetchTenders: async (req, res) => {
    try {
      const data = await model.getTenders();
      res.status(200).json({ status: 200, tenders: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchTender: async (req, res) => {
    const tenderId = req.params.tender;
    try {
      const data = await model.getTender(tenderId);
      res.status(200).json({ status: 200, tender: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchUserTenders: async (req, res) => {
    try {
      const data = await model.getTendersUser(req.userId);
      res.status(200).json({ status: 200, tenders: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchUserRules: async (req, res) => {
    try {
      const data = await model.getRulesUser(req.userId);
      res.status(200).json({ status: 200, rules: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  deleteTender: async (req, res) => {
    const tenderId = req.params.tender;
    try {
      await model.removeTender(tenderId);
      res.status(200).json({ status: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  createGroup: async (req, res) => {
    try {
      const id = await model.createGroup(req.body.name);
      res.status(200).json({ status: 200, group: id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
};
