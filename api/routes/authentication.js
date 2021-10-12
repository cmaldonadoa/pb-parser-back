var controller = require("../controllers/authentication");

module.exports = function (app) {
  app.post("/auth", controller.authenticate);
  app.post("/create_user", controller.register);
};
