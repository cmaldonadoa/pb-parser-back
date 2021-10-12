var controller = require("../controllers/storage");
const { reviewerOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.post("/upload", reviewerOnly, controller.upload);
  app.delete("/files/:file", reviewerOnly, controller.removeFile);
  app.get("/files", reviewerOnly, controller.fetchFiles);
  app.get("/self_files", reviewerOnly, controller.fetchFilesUser);
};
