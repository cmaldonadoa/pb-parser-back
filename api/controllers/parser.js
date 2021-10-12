const util = require("util");
var exec = require("child_process").exec;
var execPromise = util.promisify(exec);
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

const log = (...args) => {
  console.log("\x1b[34m", ...args, "\x1b[0m");
  return true;
};

module.exports = {
  parse: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupIds = req.body.group_ids.split(",");
    const path = `${__dirname}/../../files/${fileId}`;
    let responseSent = false;

    storage.getFileWithType({ fileId: fileId }, async (err, info) => {
      if (err)
        errorResponse(fileId, "Reading info", err) &&
          res.status(500).json({ status: 500 });

      for await (const groupId of groupIds) {
        await manager.getRulesByGroupFull(parseInt(groupId), (err, rules) => {
          if (err)
            errorResponse(fileId, "Reading rules", err) &&
              res.status(500).json({ status: 500 });

          exec(
            `python3 ${__dirname}/../../py/data_getter.py '${path}/${
              info.file.name
            }.ifc' '${JSON.stringify(
              rules.filter((e) => e.modelTypes.indexOf(info.type[0].name) >= 0)
            )}'`,
            (err, stdout, stderr) => {
              if (err)
                errorResponse(fileId, "Parsing", err) &&
                  res.status(500).json({ status: 500 });

              parser.saveMetadata(
                { fileId, metadata: JSON.parse(stdout) },
                (err) =>
                  err &&
                  errorResponse(fileId, "Saving data", err) &&
                  res.status(500).json({ status: 500 }) &&
                  (responseSent = true)
              );
            }
          );
        });
      }

      !responseSent && res.status(200).json({ stauts: 200 });
    });
  },
  check: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupIds = req.body.group_ids.split(",");

    try {
      await storage.getFileWithType({ fileId: fileId }, async (err, info) => {
        const response = {};
        let responseSent = false;

        for await (const groupId of groupIds) {
          const results = {};
          let rules = [];

          await manager.getRulesByGroupFull(
            parseInt(groupId),
            (err, result) => {
              if (err) throw err;
              rules = rules.filter(
                (e) => e.modelTypes.indexOf(info.type[0].name) >= 0
              );
              rules = result.map((r) => ({
                id: r.id,
                formula: r.formula,
                name: r.name,
                description: r.description,
              }));
            }
          );

          for await (const rule of rules) {
            const { id: ruleId, formula, name, description } = rule;

            const { ruleMetadata, ruleMap } = await parser.getRuleMetadata(
              { fileId, ruleId },
              (err) =>
                err && errorResponse("Metadata", "error getting metadata", err)
            );

            const { stdout, stderr } = await execPromise(
              `python3 ${__dirname}/../../py/data_checker.py '${formula}' '${JSON.stringify(
                ruleMetadata
              )}' '${JSON.stringify(ruleMap)}'`
            );

            results[ruleId] = {
              name: name,
              description: description,
              result: JSON.parse(stdout),
              filter: ruleMap,
            };

            if (Object.keys(results).length === rules.length) {
              response[groupId] = results;
            }
          }
        }

        !responseSent && res.status(200).json({ status: 200, data: response });
      });
    } catch (err) {
      errorResponse(fileId, "Checking data", err) &&
        res.status(500).json({ status: 500 });
    }
  },
};
