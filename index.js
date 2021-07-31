var express = require("express");
var bodyParser = require("body-parser");
var fileUpload = require("express-fileupload");
var cors = require("cors");

var app = express();

// Settings
app.set("port", 8000);
app.enable("trust proxy");

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: "128mb" }));
app.use(
  fileUpload({
    safeFileNames: true,
    preserveExtension: true,
    createParentPath: true,
  })
);

// Routes
require("./api/routes/storage")(app);
require("./api/routes/parser")(app);
require("./api/routes/manager")(app);

app.use("/", express.static(__dirname + "/front"));

app.all("*", function (req, res) {
  res.status(404).json({
    status: 404,
    msg: "Page not found.",
  });
});
// Start

var server = app.listen(app.get("port"), () => {
  console.log(`[${new Date().toISOString()}] Connected on ${app.get("port")}`);
});
server.timeout = 20 * 60 * 1000;
