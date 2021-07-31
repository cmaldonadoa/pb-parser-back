var controller = require("../controllers/manager");

module.exports = function (app) {
  app.post("/rules", controller.createRule);
  app.get("/rules", controller.fetchRules);
};
