var controller = require("../controllers/storage");

module.exports = function (app) {
  app.post("/upload", controller.upload);
  app.get("/files", controller.fetchFiles);
};
