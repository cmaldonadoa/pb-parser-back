var exec = require("child_process").exec;
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

const log = (...args) => {
  console.log(...args);
  return true;
};

module.exports = {
  parse: (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupId = parseInt(req.body.group_id);
    const path = `${__dirname}/../../files/${fileId}`;

    storage.getFileWithType({ fileId: fileId }, (err, info) =>
      err
        ? errorResponse(fileId, "Reading info", err) &&
          res.status(500).json({ status: 500 })
        : manager.getRulesByGroupFull(groupId, (err, rules) =>
            err
              ? errorResponse(fileId, "Reading rules", err) &&
                res.status(500).json({ status: 500 })
              : exec(
                  `python3 py/data_getter.py '${path}/${
                    info.file.name
                  }.ifc' '${JSON.stringify(
                    rules.filter(
                      (e) => e.modelTypes.indexOf(info.type[0].name) >= 0
                    )
                  )}'`,
                  (err, stdout, stderr) =>
                    err
                      ? errorResponse(fileId, "Parsing", err) &&
                        res.status(500).json({ status: 500 })
                      : parser.saveMetadata(
                          { fileId, metadata: JSON.parse(stdout) },
                          (err) =>
                            err
                              ? errorResponse(fileId, "Saving data", err) &&
                                res.status(500).json({ status: 500 })
                              : res.status(200).json({ stauts: 200 })
                        )
                )
          )
    );
  },
  check: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupId = parseInt(req.body.group_id);

    try {
      const results = {};

      let rules = [];
      await manager.getRulesByGroupHeader(groupId, (err, result) => {
        if (err) throw err;
        rules = result.map((r) => r.rule_id);
      });

      for await (const ruleId of rules) {
        await manager.getRuleHeader(ruleId, (err, rule) => {
          if (err) throw err;
          parser.getRuleMetadata({ fileId, ruleId }, (err, metadata) => {
            const { ruleMetadata, ruleMap } = metadata;
            if (err) throw err;
            exec(
              `python3 py/data_checker.py '${rule.formula}' '${JSON.stringify(
                ruleMetadata
              )}' '${JSON.stringify(ruleMap)}'`,
              (err, stdout, stderr) => {
                if (err) {
                  errorResponse(fileId, `Checking ${ruleId}`, stderr);
                  res.status(500).json({ status: 500 });
                  return;
                }
                results[rule.name] = JSON.parse(stdout);
                if (Object.keys(results).length === rules.length)
                  res.status(200).json({ status: 200, data: results });
              }
            );
          });
        });
      }
    } catch (err) {
      errorResponse(fileId, "Checking data", err) &&
        res.status(500).json({ status: 500 });
    }
  },
};
