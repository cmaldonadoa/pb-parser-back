var exec = require("child_process").exec;
const { v4: uuidv4 } = require("uuid");
const model = require("../models/manager.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

const TypeEnum = {
  PSET: "pset",
  TYPE: "type",
  DEFAULT: "default",
};

module.exports = {
  createRule: (req, res) => {
    const { attribute, type, meta, include, exclude, scope, name } = req.body;

    const rule = {
      type,
      ...(type !== TypeEnum.TYPE && { attribute }),
      ...(type === TypeEnum.PSET && { pset: meta }),
      ...{
        include: Array.isArray(include) ? include : include ? [include] : [],
      },
      ...{
        exclude: Array.isArray(exclude) ? exclude : exclude ? [exclude] : [],
      },
      scope,
      ...(scope === "space" && { name }),
    };

    model.appendRule(rule, (err) =>
      err
        ? errorResponse("Rules", "Saving the file", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200 })
    );
  },

  fetchRules: (req, res) => {
    model.readRules((err, data) =>
      err
        ? errorResponse("Rules", "Reading the file", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200, rules: data })
    );
  },
};
