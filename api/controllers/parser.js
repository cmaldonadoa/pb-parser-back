var exec = require("child_process").exec;
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

module.exports = {
  parse: (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupId = parseInt(req.body.group_id);
    const path = `${__dirname}/../../files/${fileId}`;

    manager.getAllRules({ groupId }, (err, rules) =>
      err
        ? errorResponse(fileId, "Reading rules", err) &&
          res.status(500).json({ status: 500 })
        : storage.getFile({ id: fileId }, (err, info) =>
            err
              ? errorResponse(fileId, "Reading info", err) &&
                res.status(500).json({ status: 500 })
              : exec(
                  `python3 py/data_getter.py '${path}/${
                    info.name
                  }.ifc' '${JSON.stringify(rules)}'`,
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
      await manager.getRules({ groupId }, (err, result) => {
        if (err) throw err;
        rules = result.map((r) => r.rule_id);
      });

      for await (const ruleId of rules) {
        await manager.getRuleBasicInfo({ ruleId }, (err, row) => {
          if (err) throw err;
          parser.getRuleMetadata({ fileId, ruleId }, (err, mapping) => {
            if (err) throw err;
            exec(
              `python3 py/data_checker.py '${row[0].formula}' '${JSON.stringify(
                mapping
              )}'`,
              (err, stdout, stderr) => {
                if (err) {
                  errorResponse(fileId, "Checking", stderr);
                  res.status(500).json({ status: 500 });
                  return;
                }
                results[row[0].name] = JSON.parse(stdout);
                //!JSON.parse(stdout) && console.log(row[0].name, mapping);
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
