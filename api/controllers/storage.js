var exec = require("child_process").execSync;
const model = require("../models/storage.js");

module.exports = {
  upload: async (req, res) => {
    const file = req.files ? req.files.file : null;
    const { type, validate } = req.body;

    if (!file || !type) {
      res.status(400).json({
        status: 400,
        msg: "Missing file or type",
      });
      return;
    }

    if (
      !/\.ifc$/.test(file.name) &&
      !/\.zip$/.test(file.name) &&
      !/\.ifczip$/.test(file.name)
    ) {
      res.status(400).json({
        status: 400,
        msg: "Accepted file formats: IFC, ZIP, IFCZIP",
      });
      return;
    }

    const regexp = /\..+$/;
    const filename = file.name.replace(regexp, "");
    const extension = file.name.match(regexp)[0];
    const path = `${__dirname}/../../files`;
    const zipped = extension === "zip" || extension === "ifczip";

    if (
      Boolean(validate) &&
      !/^\w{2,6}-\w{3,6}-\w{3,6}-\w{1,2}-(ZZ|XX|\d{2}|(E|S)\d)-\w{2}(-\d{4})?(-\w*)?(-[TCPA]{1,3})(-[a-zA-Z]{1,2})?$/.test(
        filename
      )
    ) {
      res.status(400).json({
        status: 400,
        msg: "Wrong name",
      });
      return;
    }

    try {
      const id = await model.saveFile(req.userId, { name: filename, type });
      await file.mv(`${path}/${id}/${file.name}`);
      if (zipped) {
        exec(
          `unzip -p ${path}/${id}/${file.name} > ${filename}.ifc && rm -f ${file.name}`
        );
      }
      res.status(200).json({ status: 200, id: id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
  fetchFiles: async (req, res) => {
    try {
      const data = await model.getFiles(req.userId);
      res.status(200).json({ status: 200, files: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  fetchFilesUser: async (req, res) => {
    try {
      const data = await model.getFilesUser(req.userId);
      res.status(200).json({ status: 200, files: data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },

  removeFile: async (req, res) => {
    try {
      await model.deleteFile(req.params.file);
      const path = `${__dirname}/../../files`;
      exec(`rm -rf ${path}/${req.params.file}`);
      res.status(200).json({ status: 200 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500 });
    }
  },
};
