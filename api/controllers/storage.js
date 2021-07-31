var exec = require("child_process").exec;
const { v4: uuidv4 } = require("uuid");
const model = require("../models/storage.js");

const errorResponse = (filename, variant, error) =>
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);

module.exports = {
  upload: (req, res) => {
    let files = req.files ? req.files.file : undefined;
    files = Array.isArray(files) ? files : [files];

    const uuid = uuidv4().replace(/-/g, "");

    !files.every(
      (file) =>
        /.+\.ifc$/.test(file.name) ||
        /.+\.zip$/.test(file.name) ||
        /.+\.ifczip$/.test(file.name)
    )
      ? res.status(400).json({
          status: 400,
          msg: "Accepted file formats: IFC, ZIP, IFCZIP",
        })
      : res.status(200).json({
          status: 200,
          uuid,
        });

    files.forEach((file) => {
      const regexp = /\..+$/;
      const filename = file.name.replace(regexp, "");
      const extension = file.name.match(regexp)[0];
      const path = `${__dirname}/../../files`;
      const zipped = extension === "zip" || extension === "ifczip";

      const saveFile = () =>
        model.saveInfo(
          {
            uuid: uuid,
            info: JSON.stringify({
              filename: filename,
              extension: extension,
            }),
          },
          (err, data) =>
            err ? errorResponse(filename, "Saving the file", err) : null
        );

      // File accepted, create the file
      file.mv(`${path}/${uuid}/${file.name}`, (err) =>
        err // Error creating the file
          ? errorResponse(filename, "Moving the file", err)
          : zipped
          ? exec(
              `unzip -p ${path}/${uuid}/${file.name} > ${filename}.ifc && rm -f ${file.name}`,
              (err, stdout, stderr) =>
                err ? errorResponse(uuid, "Unzipping", err) : saveFile()
            )
          : saveFile()
      );
    });
  },
};
