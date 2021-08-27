var exec = require("child_process").exec;
const model = require("../models/storage.js");

const errorResponse = (filename, variant, error) => {
  console.log(`\x1b[41m[${filename}] ERROR ${variant}:\x1b[0m`, error);
  return true;
};

module.exports = {
  upload: (req, res) => {
    let files = req.files ? req.files.file : undefined;
    files = Array.isArray(files) ? files : [files];

    if (
      !files.every(
        (file) =>
          /.+\.ifc$/.test(file.name) ||
          /.+\.zip$/.test(file.name) ||
          /.+\.ifczip$/.test(file.name)
      )
    ) {
      res.status(400).json({
        status: 400,
        msg: "Accepted file formats: IFC, ZIP, IFCZIP",
      });
      return;
    }

    files.forEach((file) => {
      const regexp = /\..+$/;
      const filename = file.name.replace(regexp, "");
      const extension = file.name.match(regexp)[0];
      const path = `${__dirname}/../../files`;
      const zipped = extension === "zip" || extension === "ifczip";

      model.saveFile({ name: filename }, (err, id) =>
        err
          ? errorResponse(filename, "Saving the file to DB", err) &&
            res.status(500).json({ status: 500 })
          : file.mv(`${path}/${id}/${file.name}`, (err) =>
              err // Error creating the file
                ? errorResponse(filename, "Moving the file", err) &&
                  res.status(500).json({ status: 500 })
                : zipped
                ? exec(
                    `unzip -p ${path}/${id}/${file.name} > ${filename}.ifc && rm -f ${file.name}`,
                    (err, stdout, stderr) =>
                      err
                        ? errorResponse(id, "Unzipping", err) &&
                          res.status(500).json({ status: 500 })
                        : res.status(200).json({ status: 200, id: id })
                  )
                : res.status(200).json({ status: 200, id: id })
            )
      );
    });
  },
  fetchFiles: (req, res) => {
    model.getFiles((err, data) =>
      err
        ? errorResponse(filename, "Fetching files", err) &&
          res.status(500).json({ status: 500 })
        : res.status(200).json({ status: 200, files: data })
    );
  },
};
