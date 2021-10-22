var exec = require("child_process").execSync;
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");
const authentication = require("../models/authentication.js");
const pdf = require("../utils/pdf/pdf.js");

module.exports = {
  parse: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupIds = req.body.group_ids.split(",");
    const path = `${__dirname}/../../files/${fileId}`;

    try {
      const { file, type } = await storage.getFileWithType({ fileId: fileId });
      for await (const groupId of groupIds) {
        const rules = await manager.getRulesByGroupFull(parseInt(groupId));
        const buffer = exec(
          `python3 ${__dirname}/../../py/data_getter.py '${path}/${
            file.name
          }.ifc' '${JSON.stringify(
            rules.filter((e) => e.modelTypes.indexOf(type[0].name) >= 0)
          )}'`
        );

        await parser.saveMetadata({
          fileId,
          metadata: JSON.parse(buffer.toString()),
        });
      }
      res.status(200).json({ stauts: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  check: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const tenderId = parseInt(req.body.tender_id);
    const groupIds = req.body.group_ids.split(",");

    try {
      const { file, type } = await storage.getFileWithType({ fileId: fileId });
      const response = {};

      await parser.deleteResults(fileId);

      for await (const groupId of groupIds) {
        const results = {};
        let rules = [];

        const result = await manager.getRulesByGroupFull(parseInt(groupId));

        rules = rules.filter((e) => e.modelTypes.indexOf(type[0].name) >= 0);
        rules = result.map((r) => ({
          id: r.id,
          formula: r.formula,
          name: r.name,
          description: r.description,
        }));

        for await (const rule of rules) {
          const { id: ruleId, formula, name, description } = rule;

          const { ruleMetadata, ruleMap } = await parser.getRuleMetadata({
            fileId,
            ruleId,
          });

          const buffer = exec(
            `python3 ${__dirname}/../../py/data_checker.py '${formula}' '${JSON.stringify(
              ruleMetadata
            )}' '${JSON.stringify(ruleMap)}'`
          );

          const result = JSON.parse(buffer.toString());
          results[ruleId] = {
            name: name,
            description: description,
            result: result,
            filter: ruleMap,
          };

          await parser.saveResult(fileId, ruleId, tenderId, result);
        }

        response[groupId] = results;
      }

      res.status(200).json({ status: 200, data: response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  getResultsPdf: async (req, res) => {
    const fileId = parseInt(req.params.file);
    const userId = parseInt(req.body.userId);
    try {
      const { file, type } = await storage.getFileWithType({ fileId });
      const username = await authentication.getUsername({ userId });
      const { results, tenderId } = await parser.getResults(fileId);
      const tender = await manager.getTender(tenderId);

      const data = results.reduce((rv, x) => {
        (rv[x["group"]] = rv[x["group"]] || []).push(x);
        return rv;
      }, {});

      await pdf.writePdf(fileId, {
        filename: file.name,
        username,
        type: type[0].name,
        tender: tender.name,
        data,
      });
      res
        .status(200)
        .download(`${__dirname}/../../files/${fileId}/results.pdf`);
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
};
