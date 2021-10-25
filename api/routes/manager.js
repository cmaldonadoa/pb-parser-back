var controller = require("../controllers/manager");
const { adminOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.put("/rules/:rule", adminOnly, controller.updateRule);
  app.delete("/rules/:rule", adminOnly, controller.deleteRule);
  app.post("/rules", adminOnly, controller.createRule);
  app.post("/rules-multiple/:group", adminOnly, controller.createRuleMultiple);

  app.get("/rules/:group/:rule", controller.fetchRule);
  app.get("/rules/:group", controller.fetchRules);

  app.get("/groups", controller.fetchGroups);
  app.post("/groups", adminOnly, controller.createGroup);
  app.post("/parse_formula", controller.parseFormula);

  app.get("/regions", controller.fetchRegions);
  app.get("/regions/:region", controller.fetchCommunes);

  app.put("/tenders/:tender", adminOnly, controller.updateTender);
  app.post("/tenders", adminOnly, controller.createTender);
  app.delete("/tenders/:tender", adminOnly, controller.deleteTender);
  app.get("/tenders/:tender", controller.fetchTender);
  app.get("/tenders", controller.fetchTenders);

  app.get("/self_tenders", adminOnly, controller.fetchUserTenders);
  app.get("/self_rules", adminOnly, controller.fetchUserRules);
};
