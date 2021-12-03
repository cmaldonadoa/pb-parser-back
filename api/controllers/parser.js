var exec = require("child_process").execSync;
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");
const authentication = require("../models/authentication.js");
const pdf = require("../utils/pdf/pdf.js");
const logger = require("../utils/logger");

module.exports = {
  parse: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const groupIds = req.body.group_ids.split(",");
    const path = `${__dirname}/../../files/${fileId}`;

    try {
      // Parse rules
      const { file, type } = await storage.getFileWithType({ fileId: fileId });
      for await (const groupId of groupIds) {
        const rules = await manager.getRulesByGroupFull(parseInt(groupId));
        const buffer1 = exec(
          `python3 ${__dirname}/../../py/data_getter.py '${path}/${
            file.name
          }.ifc' '${JSON.stringify(
            rules.filter((e) => e.modelTypes.indexOf(type[0].name) >= 0)
          )}'`
        );

        await parser.saveMetadata({
          fileId,
          metadata: JSON.parse(buffer1.toString()),
        });

        // Check intersections
        const buffer2 = exec(
          `python3 ${__dirname}/../../py/collision_checker.py '${path}/${file.name}.ifc'`
        );

        const { intersections, duplicates } = JSON.parse(buffer2.toString());
        for await (const intersection of intersections) {
          const [data1, data2] = intersection;
          const [type1, location1, guid1] = data1;
          const [type2, location2, guid2] = data2;

          const ifcId1 = await parser.saveIfcElement({
            fileId,
            type: type1,
            location: location1,
            guid: guid1,
          });

          const ifcId2 = await parser.saveIfcElement({
            fileId,
            type: type2,
            location: location2,
            guid: guid2,
          });

          await parser.saveIntersection(ifcId1, ifcId2);
        }

        for await (const duplicate of duplicates) {
          const [type, location, guid1, guid2] = duplicate;

          const ifcId1 = await parser.saveIfcElement({
            fileId,
            type,
            location,
            guid: guid1,
          });

          const ifcId2 = await parser.saveIfcElement({
            fileId,
            type,
            location,
            guid: guid2,
          });

          await parser.saveDuplicate(ifcId1, ifcId2);
        }
      }
      res.status(200).json({ stauts: 200 });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  check: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const tenderId = parseInt(req.body.tender_id);
    const groupIds = req.body.group_ids.split(",");

    try {
      const { type } = await storage.getFileWithType({ fileId: fileId });

      const tender = await manager.getTender(tenderId);
      const vars = {
        VULNERABLE: tender.vulnerable,
        MEDIOS_1: tender.medios_1,
        MEDIOS_2: tender.medios_2,
        SUELO: tender.soil_occupancy_coef,
        CONSTRUCTIBILIDAD: tender.constructability_coef,
        ROL: tender.property_role,
        ANGULO: tender.angle,
      };

      await parser.deleteResults(fileId);

      for await (const groupId of groupIds) {
        let rules = [];

        const result = await manager.getRulesByGroupFull(parseInt(groupId));

        rules = rules.filter(
          (e) =>
            e.buildingType.indexOf(tenderId.building_type_name) >= 0 &&
            e.modelTypes.indexOf(type[0].name) >= 0
        );
        rules = result.map((r) => ({
          id: r.id,
          formula: r.formula,
          name: r.name,
          description: r.description,
        }));

        for await (const rule of rules) {
          const { id: ruleId, formula } = rule;

          const { ruleMetadata, ruleMap } = await parser.getRuleMetadata({
            fileId,
            ruleId,
          });

          const buffer = exec(
            `python3 ${__dirname}/../../py/data_checker.py '${formula}' '${JSON.stringify(
              ruleMetadata
            )}' '${JSON.stringify(ruleMap)}' '${JSON.stringify(vars)}'`
          );

          const result = JSON.parse(buffer.toString());

          await parser.saveResult(fileId, ruleId, tenderId, result);
        }
      }

      res.status(200).json({ status: 200 });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  getResults: async (req, res) => {
    const fileId = parseInt(req.params.file);
    try {
      const { results } = await parser.getResults(fileId);
      const data = results.reduce((rv, x) => {
        (rv[x["group"]] = rv[x["group"]] || []).push(x);
        return rv;
      }, {});

      const intersections = await parser.getIntersections(fileId);

      const isNameValid = await storage
        .getFile({ id: fileId })
        .then((res) => res.is_valid);

      res.status(200).json({
        status: 200,
        results: data,
        intersections: intersections.intersections,
        duplicates: intersections.duplicates,
        isNameValid,
      });
    } catch (error) {
      logger.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  getResultsPdf: async (req, res) => {
    const fileId = parseInt(req.params.file);
    const userId = parseInt(req.userId);
    try {
      const { file, type } = await storage.getFileWithType({ fileId });
      const username = await authentication.getUsername({ userId });
      const { results, tenderId } = await parser.getResults(fileId);
      const tender = await manager.getTender(tenderId);

      const data = results.reduce((rv, x) => {
        (rv[x["group"]] = rv[x["group"]] || []).push(x);
        return rv;
      }, {});

      await pdf.writePdf(
        fileId,
        {
          filename: file.name,
          username,
          type: type[0].name,
          tender: tender.name,
          data,
        },
        () =>
          res
            .status(200)
            .download(`${__dirname}/../../files/${fileId}/results.pdf`)
      );
    } catch (error) {
      logger.error(error);
      res.status(500).json({ status: 500 });
    }
  },
};
