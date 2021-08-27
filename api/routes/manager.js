var controller = require("../controllers/manager");

module.exports = function (app) {
  app.put("/rules/:rule", controller.updateRule);
  app.delete("/rules/:rule", controller.deleteRule);
  app.post("/rules", controller.createRule);
  app.post("/rules-multiple", controller.createRuleMultiple);
  app.get("/rules/:group/:rule", controller.fetchRule);
  app.get("/rules/:group", controller.fetchRules);
  app.get("/groups", controller.fetchGroups);
  app.post("/parse_formula", controller.parseFormula);
};
