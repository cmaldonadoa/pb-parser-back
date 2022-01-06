var exec = require("child_process").execSync;
const model = require("../models/manager.js");
const logger = require("../utils/logger");

const { tcWrapper } = logger;

module.exports = {
  createRule: async (req, res) => {
    tcWrapper(async () => {
      const ruleId = await model.createRule(req.userId, req.body);
      res.status(200).json({ status: 200, ruleId });
    });
  },
  updateRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      await model.updateRule(ruleId, req.body);
      res.status(200).json({ status: 200 });
    });
  },
  fetchRules: async (req, res) => {
    const groupId = parseInt(req.params.group);
    tcWrapper(async () => {
      const data = await model.getRulesByGroupHeader(parseInt(groupId));
      res.status(200).json({ status: 200, rules: data });
    });
  },
  fetchRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      const data = await model.getRuleFull(parseInt(ruleId));
      res.status(200).json({ status: 200, rule: data });
    });
  },
  deleteRule: async (req, res) => {
    const ruleId = parseInt(req.params.rule);
    tcWrapper(async () => {
      await model.deleteRule(ruleId);
      res.status(200).json({ status: 200 });
    });
  },
  parseFormula: async (req, res) => {
    const formula = req.body.formula;

    tcWrapper(async () => {
      const buffer = exec(
        `python3 ${__dirname}/../../py/formula_parser.py "${formula}"`
      );
      res.status(200).json({ status: 200, latex: buffer.toString() });
    });
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
    });
  },
  fetchGroups: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getGroups();
      res.status(200).json({ status: 200, groups: data });
    });
  },

  fetchRegions: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getRegions();
      res.status(200).json({ status: 200, regions: data });
    });
  },
  fetchCommunes: async (req, res) => {
    const regionId = parseInt(req.params.region);

    tcWrapper(async () => {
      const data = await model.getCommunes(regionId);
      res.status(200).json({ status: 200, communes: data });
    });
  },

  createTender: async (req, res) => {
    tcWrapper(async () => {
      const tenderId = await model.createTender(req.userId, req.body);
      res.status(200).json({ status: 200, tenderId });
    });
  },

  fetchTenders: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getTenders(req.userId);
      res.status(200).json({ status: 200, tenders: data });
    });
  },
  fetchTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);
    tcWrapper(async () => {
      const data = await model.getTender(tenderId);
      res.status(200).json({ status: 200, tender: data });
    });
  },
  fetchUserTenders: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getTendersUser(req.userId);
      res.status(200).json({ status: 200, tenders: data });
    });
  },
  fetchUserRules: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getRulesUser(req.userId);
      res.status(200).json({ status: 200, rules: data });
    });
  },
  deleteTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);
    tcWrapper(async () => {
      await model.removeTender(tenderId);
      res.status(200).json({ status: 200 });
    });
  },
  updateTender: async (req, res) => {
    const tenderId = parseInt(req.params.tender);

    tcWrapper(async () => {
      await model.updateTender(tenderId, req.body);
      res.status(200).json({ status: 200 });
    });
  },
  createGroup: async (req, res) => {
    tcWrapper(async () => {
      const id = await model.createGroup(req.body.name);
      res.status(200).json({ status: 200, group: id });
    });
  },

  fetchEntities: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getEntities();
      res.status(200).json({ status: 200, entities: data });
    });
  },
};
