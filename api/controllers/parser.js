var exec = require("child_process").exec;
const storage = require("../models/storage.js");

const errorResponse = (filename, variant, error) =>
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);

module.exports = {
  parse: (req, res) => {
    const uuid = req.params.uuid;
    const path = `${__dirname}/../../files/${uuid}`;

    storage.readInfo({ uuid }, (err, info) =>
      err
        ? errorResponse(uuid, "Reading info", err)
        : exec(
            `python3 py/rules_creator.py ${path}/${info.filename}.ifc`,
            (err, stdout, stderr) =>
              err
                ? errorResponse(uuid, "Parsing", err)
                : res
                    .status(200)
                    .json({ status: 200, data: JSON.parse(stdout) })
          )
    );
  },
};
