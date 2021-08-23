var controller = require("../controllers/manager");

module.exports = function (app) {
  app.put("/rules/:rule", controller.updateRule);
  app.delete("/rules/:rule", controller.deleteRule);
  app.post("/rules", controller.createRule);
  app.get("/rules/:group/:rule", controller.fetchRule);
  app.get("/rules/:group", controller.fetchRules);
  app.post("/parse_formula", controller.parseFormula);
};
