var controller = require("../controllers/parser");
const { reviewerOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.post("/parse", reviewerOnly, controller.parse);
  app.post("/check", reviewerOnly, controller.check);
  app.get("/results/:file", reviewerOnly, controller.getResults);
  app.post("/results/:file", reviewerOnly, controller.getResultsPdf);
};
