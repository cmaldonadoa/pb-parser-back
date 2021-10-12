var controller = require("../controllers/storage");
const { reviewerOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.post("/upload", reviewerOnly, controller.upload);
  app.get("/files", reviewerOnly, controller.fetchFiles);
  app.get("/self_files", reviewerOnly, controller.fetchFilesUser);
};
