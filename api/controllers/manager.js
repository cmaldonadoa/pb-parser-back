var exec = require("child_process").execSync;
const model = require("../models/manager.js");
const utils = require("../utils");

const { tcWrapper } = utils;

module.exports = {
  createRule: async (req, res) => {
    tcWrapper(async () => {
      const ruleId = await model.createRule(req.userId, req.body);
      res.status(200).json({ status: 200, ruleId });
    }, res);
  },
  updateRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      await model.updateRule(ruleId, req.body);
      res.status(200).json({ status: 200 });
    }, res);
  },
  fetchRules: async (req, res) => {
    const groupId = parseInt(req.params.group);
    tcWrapper(async () => {
      const data = await model.getRulesByGroupHeader(parseInt(groupId));
      res.status(200).json({ status: 200, rules: data });
    }, res);
  },
  fetchRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      const data = await model.getRuleFull(parseInt(ruleId));
      res.status(200).json({ status: 200, rule: data });
    }, res);
  },
  deleteRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      await model.deleteRule(ruleId);
      res.status(200).json({ status: 200 });
    }, res);
  },
  parseFormula: async (req, res) => {
    const formula = req.body.formula;

    tcWrapper(async () => {
      const buffer = exec(
        `python3 ${__dirname}/../../py/formula_parser.py "${formula}"`
      );
      res.status(200).json({ status: 200, latex: buffer.toString() });
    }, res);
  },

  createRuleMultiple: async (req, res) => {
    const rules = req.body;
    const groupId = parseInt(req.params.group);

    tcWrapper(async () => {
      for await (const rule of rules) {
        rule.group = groupId;
        rule.modelTypes = ["ARQUITECTURA", "VOLUMETRICO", "SITIO"];
        rule.display = rule.display || null;
        rule.filters = rule.filters.map((f, i) => ({
          ...f,
          index: i,
          name: "p" + i,
          spaces: f.spaces || [],
          excluded: f.excluded || [],
          constraints: f.constraints.map((c, j) => ({
            ...c,
            index: j,
            values: c.values || [],
          })),
        }));

        await model.createRule(req.userId, rule);
      }
      res.status(200).json({ status: 200 });
    }, res);
  },
  fetchGroups: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getGroups();
      res.status(200).json({ status: 200, groups: data });
    }, res);
  },

  fetchRegions: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getRegions();
      res.status(200).json({ status: 200, regions: data });
    }, res);
  },
  fetchCommunes: async (req, res) => {
    const regionId = parseInt(req.params.region);

    tcWrapper(async () => {
      const data = await model.getCommunes(regionId);
      res.status(200).json({ status: 200, communes: data });
    }, res);
  },

  createTender: async (req, res) => {
    tcWrapper(async () => {
      const tenderId = await model.createTender(req.userId, req.body);
      res.status(200).json({ status: 200, tenderId });
    }, res);
  },

  fetchTenders: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getTenders(
        req.role === "REVIEWER" ? req.userId : null
      );
      res.status(200).json({ status: 200, tenders: data });
    }, res);
  },
  fetchTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);
    tcWrapper(async () => {
      const data = await model.getTender(tenderId);
      res.status(200).json({ status: 200, tender: data });
    }, res);
  },
  fetchUserTenders: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getTendersUser(req.userId);
      res.status(200).json({ status: 200, tenders: data });
    }, res);
  },
  fetchUserRules: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getRulesUser(req.userId);
      res.status(200).json({ status: 200, rules: data });
    }, res);
  },
  deleteTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);
    tcWrapper(async () => {
      await model.removeTender(tenderId);
      res.status(200).json({ status: 200 });
    }, res);
  },
  updateTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);

    tcWrapper(async () => {
      await model.updateTender(tenderId, req.body);
      res.status(200).json({ status: 200 });
    }, res);
  },
  createGroup: async (req, res) => {
    tcWrapper(async () => {
      const id = await model.createGroup(req.body.name);
      res.status(200).json({ status: 200, group: id });
    }, res);
  },

  fetchEntities: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getEntities();
      res.status(200).json({ status: 200, entities: data });
    }, res);
  },
};
