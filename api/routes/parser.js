var controller = require("../controllers/parser");

module.exports = function (app) {
  app.post("/parse", controller.parse);
  app.post("/check", controller.check);
};
