var controller = require("../controllers/parser");
const { reviewerOnly } = require("../controllers/authentication");

module.exports = function (app) {
  app.post("/parse", reviewerOnly, controller.parse);
  app.post("/check", reviewerOnly, controller.check);
};
