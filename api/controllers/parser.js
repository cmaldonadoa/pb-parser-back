var exec = require("child_process").execSync;
const storage = require("../models/storage.js");
const manager = require("../models/manager.js");
const parser = require("../models/parser.js");
const authentication = require("../models/authentication.js");
const pdf = require("../utils/pdf/pdf.js");
const logger = require("../utils/logger");

const { tcWrapper } = logger;

module.exports = {
  parse: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const tenderId = parseInt(req.body.tender_id);
    const groupIds = req.body.group_ids.split(",");
    const path = `${__dirname}/../../files/${fileId}`;

    tcWrapper(async () => {
      // Parse rules
      const { file, type } = await storage.getFileWithType({ fileId: fileId });
      const tender = await manager.getTender(tenderId);

      for await (const groupId of groupIds) {
        const rules = await manager.getRulesByGroupFull(parseInt(groupId));
        const buffer1 = exec(
          `python3 ${__dirname}/../../py/data_getter.py '${path}/${
            file.name
          }.ifc' '${JSON.stringify(
            rules.filter(
              (e) =>
                e.buildingTypes.includes(tender.building_type_name) &&
                e.modelTypes.includes(type)
            )
          )}'`
        );

        await parser.saveMetadata({
          fileId,
          metadata: JSON.parse(buffer1.toString()),
        });

        // Check intersections
        const isMEI = await manager
          .getGroups()
          .then((res) => res.filter((row) => row.group_id == groupId))
          .then((res) => res[0].name === "MEI");
        if (!isMEI) continue;

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
    });
  },

  check: async (req, res) => {
    const fileId = parseInt(req.body.file_id);
    const tenderId = parseInt(req.body.tender_id);
    const groupIds = req.body.group_ids.split(",");

    tcWrapper(async () => {
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
        PISOS_SUPERIORES:
          tender.upper_floors_coef === null ? -1 : tender.upper_floors_coef,
        UNIDADES_TOTALES: tender.total_units === null ? -1 : tender.total_units,
        ESTACIONAMIENTOS:
          tender.parking_lots === null ? -1 : tender.parking_lots,
        ALTURA: tender.building_height === null ? -1 : tender.building_height,
      };

      await parser.deleteResults(fileId);

      for await (const groupId of groupIds) {
        const groupRules = await manager.getRulesByGroupFull(parseInt(groupId));

        const rules = groupRules
          .filter(
            (e) =>
              e.buildingTypes.includes(tender.building_type_name) &&
              e.modelTypes.includes(type)
          )
          .map((r) => ({
            id: r.id,
            formula: r.formula,
            name: r.name,
            description: r.description,
            display: r.display,
          }));

        for await (const rule of rules) {
          const { id: ruleId, formula, display } = rule;

          const { ruleMetadata, ruleMap } = await parser.getRuleMetadata({
            fileId,
            ruleId,
          });

          const metastr = JSON.stringify(ruleMetadata);
          const mapstr = JSON.stringify(ruleMap);
          const varstr = JSON.stringify(vars);

          const result = [];

          const buffer1 = exec(
            `python3 ${__dirname}/../../py/data_checker.py '${formula}' '${metastr}' '${mapstr}' '${varstr}'`
          );
          const result1 = JSON.parse(buffer1.toString());
          result.push(result1);

          if (!!display) {
            const buffer2 = exec(
              `python3 ${__dirname}/../../py/data_checker.py '${display}' '${metastr}' '${mapstr}' '${varstr}'`
            );

            const result2 = JSON.parse(buffer2.toString());
            result.push(result2);
          } else {
            result.push(null);
          }

          await parser.saveResult(fileId, ruleId, tenderId, result);
        }
      }

      res.status(200).json({ status: 200 });
    });
  },

  getResults: async (req, res) => {
    const fileId = parseInt(req.params.file);
    tcWrapper(async () => {
      const { results } = await parser.getResults(fileId);
      const data = results.reduce((rv, x) => {
        (rv[x["group"]] = rv[x["group"]] || []).push(x);
        return rv;
      }, {});

      if (Object.keys(data).includes("MEI")) {
        const intersections = await parser.getIntersections(fileId);

        const isNameValid = await storage
          .getFile({ id: fileId })
          .then((res) => res.is_valid);

        data["MEI"].push({
          name: "Nombre del archivo",
          description:
            "El nombre del archivo cumple el estándar BIM para proyectos públicos",
          group: "MEI",
          bit: isNameValid,
          values: [],
          details: false,
        });

        data["MEI"].push({
          name: "Intersecciones",
          description: "El modelo no presenta interseccioens de entidades",
          group: "MEI",
          bit: intersections.intersections.length === 0,
          values: intersections.intersections.map((intersection) => {
            const [element1, element2] = intersection;
            const [x1, y1, z1] = element1.location;
            const [x2, y2, z2] = element2.location;
            return `${element1.type} (GUID: ${element1.guid}) ubicado en (${x1}, ${y1}, ${z1}) intersecta con ${element2.type} (GUID: ${element2.guid}) ubicado en (${x2}, ${y2}, ${z2})`;
          }),
          details: false,
        });

        data["MEI"].push({
          name: "Duplicados",
          description: "El modelo no presenta elementos duplicados",
          group: "MEI",
          bit: intersections.duplicates.length === 0,
          values: intersections.duplicates.map((duplicate) => {
            const { guid1, guid2, type, location } = duplicate;
            const [x, y, z] = location;
            return `${type} ubicado en (${x}, ${y}, ${z})  (GUIDs: ${guid1} y ${guid2})`;
          }),
          details: false,
        });
      }

      res.status(200).json({
        status: 200,
        results: data,
      });
    });
  },

  getResultsPdf: async (req, res) => {
    const fileId = parseInt(req.params.file);
    const userId = parseInt(req.userId);
    tcWrapper(async () => {
      const { file, type } = await storage.getFileWithType({ fileId });
      const username = await authentication.getUsername({ userId });
      const { results, tenderId } = await parser.getResults(fileId);
      const tender = await manager.getTender(tenderId);

      const data = results.reduce((rv, x) => {
        (rv[x["group"]] = rv[x["group"]] || []).push(x);
        return rv;
      }, {});

      if (Object.keys(data).includes("MEI")) {
        const intersections = await parser.getIntersections(fileId);

        const isNameValid = await storage
          .getFile({ id: fileId })
          .then((res) => res.is_valid);

        data["MEI"].push({
          name: "Nombre del archivo",
          description:
            "El nombre del archivo cumple el estándar BIM para proyectos públicos",
          group: "MEI",
          bit: isNameValid,
          values: [],
          details: false,
        });

        data["MEI"].push({
          name: "Intersecciones",
          description: "El modelo no presenta interseccioens de entidades",
          group: "MEI",
          bit: intersections.intersections.length === 0,
          values: intersections.intersections.map((intersection) => {
            const [element1, element2] = intersection;
            const [x1, y1, z1] = element1.location;
            const [x2, y2, z2] = element2.location;
            return `${element1.type} (GUID: ${element1.guid}) ubicado en (${x1}, ${y1}, ${z1}) intersecta con ${element2.type} (GUID: ${element2.guid}) ubicado en (${x2}, ${y2}, ${z2})`;
          }),
          details: false,
        });

        data["MEI"].push({
          name: "Duplicados",
          description: "El modelo no presenta elementos duplicados",
          group: "MEI",
          bit: intersections.duplicates.length === 0,
          values: intersections.duplicates.map((duplicate) => {
            const { guid1, guid2, type, location } = duplicate;
            const [x, y, z] = location;
            return `${type} ubicado en (${x}, ${y}, ${z})  (GUIDs: ${guid1} y ${guid2})`;
          }),
          details: false,
        });
      }

      await pdf.writePdf(
        fileId,
        {
          filename: file.name,
          username,
          type,
          tender: tender.name,
          data,
        },
        () =>
          res
            .status(200)
            .download(`${__dirname}/../../files/${fileId}/results.pdf`)
      );
    });
  },
};
