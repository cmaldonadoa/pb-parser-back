var exec = require("child_process").exec;
const model = require("../models/manager.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

module.exports = {
  createRule: (req, res) => {
    model.createRule(req.body, (err) =>
      err
        ? errorResponse("Rules", "Creating a rule", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200 })
    );
  },
  updateRule: (req, res) => {
    const ruleId = req.params.rule;

    model.updateRule(ruleId, req.body, (err) =>
      err
        ? errorResponse("Rules", "Updating a rule", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200 })
    );
  },
  fetchRules: (req, res) => {
    model.getRulesByGroupHeader(parseInt(req.params.group), (err, data) =>
      err
        ? errorResponse("Rules", "Fetching all rules", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200, rules: data })
    );
  },
  fetchRule: (req, res) => {
    model.getRuleFull(parseInt(req.params.rule), (err, data) =>
      err
        ? errorResponse("Rules", "Fetching a rule", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200, rule: data })
    );
  },
  deleteRule: (req, res) => {
    model.deleteRule(req.params.rule, (err, _) =>
      err
        ? errorResponse("Rules", "Fetching a rule", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200 })
    );
  },
  parseFormula: (req, res) => {
    const formula = req.body.formula;

    exec(
      `python3 ${__dirname}/../../py/formula_parser.py "${formula}"`,
      (err, stdout, stderr) =>
        err
          ? errorResponse(formula, "Parsing", err) &&
            res.status(500).json({ status: 500 })
          : res.status(200).json({ status: 200, latex: stdout })
    );
  },

  createRuleMultiple: async (req, res) => {
    const rules = req.body.rules;
    const groupId = req.body.group;

    let error = false;
    for await (const rule of rules) {
      rule.groupId = groupId;
      rule.modelTypes = ["ARQUITECTURA", "VOLUMETRICO", "SITIO"];
      rule.filters = rule.filters.map((f, i) => ({
        ...f,
        index: i,
        spaces: f.spaces || [],
        constraints: f.constraints.map((c, j) => ({
          ...c,
          index: j,
          values: c.values || [],
        })),
      }));

      await model.createRule(rule, (err) => {
        if (err) {
          errorResponse("Rules", "Creating a rule", err);
          error = true;
        }
      });
      if (error) break;
    }

    error
      ? res.status(500).json({ status: 500 })
      : res.status(200).json({ status: 200 });
  },
  fetchGroups: (req, res) => {
    model.getGroups((err, data) =>
      err
        ? errorResponse("Rules", "Fetching groups", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200, groups: data })
    );
  },
};
