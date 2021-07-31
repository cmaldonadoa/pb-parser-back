var controller = require("../controllers/parser");

module.exports = function(app) {
  app.post("/parse/:uuid", controller.parse);
};