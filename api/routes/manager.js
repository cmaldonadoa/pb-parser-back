var controller = require("../controllers/manager");
const { adminOnly, registeredOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.put("/rules/:rule", adminOnly, controller.updateRule);
  app.delete("/rules/:rule", adminOnly, controller.deleteRule);
  app.post("/rules", adminOnly, controller.createRule);
  app.post("/rules-multiple/:group", adminOnly, controller.createRuleMultiple);

  app.get("/entities", adminOnly, controller.fetchEntities);

  app.get("/rules/:group/:rule", registeredOnly, controller.fetchRule);
  app.get("/rules/:group", registeredOnly, controller.fetchRules);

  app.get("/groups", registeredOnly, controller.fetchGroups);
  app.post("/groups", adminOnly, controller.createGroup);
  app.post("/parse_formula", adminOnly, controller.parseFormula);

  app.get("/regions", adminOnly, controller.fetchRegions);
  app.get("/regions/:region", adminOnly, controller.fetchCommunes);

  app.put("/tenders/:tender", adminOnly, controller.updateTender);
  app.post("/tenders", adminOnly, controller.createTender);
  app.delete("/tenders/:tender", adminOnly, controller.deleteTender);
  app.get("/tenders/:tender", registeredOnly, controller.fetchTender);
  app.get("/tenders", registeredOnly, controller.fetchTenders);

  app.get("/self_tenders", adminOnly, controller.fetchUserTenders);
  app.get("/self_rules", adminOnly, controller.fetchUserRules);
};
