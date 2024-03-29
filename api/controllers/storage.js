const util = require("util");
const exec = util.promisify(require("child_process").exec);
const model = require("../models/storage.js");
const utils = require("../utils");

const { tcWrapper } = utils;

module.exports = {
  upload: async (req, res) => {
    const file = req.files ? req.files.file : null;
    const { type } = req.body;

    if (!file || !type) {
      res.status(400).json({
        status: 400,
        msg: "Missing field: file or type",
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

    const nameRegexp =
      /^\w{2,6}-\w{3,6}-\w{3,6}-\w{1,2}-(ZZ|XX|\d{2}|(E|S)\d)-\w{2}(-\d{4})?(-\w*)?(-[TCPA]{1,3})(-[a-zA-Z]{1,2})?$/;

    tcWrapper(async () => {
      const id = await model.saveFile(req.userId, {
        name: filename,
        type,
        valid: nameRegexp.test(filename),
      });
      await file.mv(`${path}/${id}/${file.name}`);
      if (zipped) {
        await exec(
          `unzip -p ${path}/${id}/${file.name} > ${filename}.ifc && rm -f ${file.name}`
        );
      }
      res.status(200).json({ status: 200, id: id });
    }, res);
  },
  fetchFiles: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getFiles(req.userId);
      res.status(200).json({ status: 200, files: data });
    }, res);
  },

  fetchFilesUser: async (req, res) => {
    tcWrapper(async () => {
      const data = await model.getFilesUser(req.userId);
      res.status(200).json({ status: 200, files: data });
    }, res);
  },

  removeFile: async (req, res) => {
    tcWrapper(async () => {
      await model.deleteFile(req.params.file);
      const path = `${__dirname}/../../files`;
      await exec(`rm -rf ${path}/${req.params.file}`);
      res.status(200).json({ status: 200 });
    }, res);
  },
};
