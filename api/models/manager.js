const fs = require("fs");

const jsonAppend = (json, data) => {
  console.log(json);
  json.push(data);
  return json;
};

const rulesPath = `${__dirname}/../../rules.json`;

module.exports = {
  appendRule: (rule, callback) => {
    try {
      fs.accessSync(rulesPath);
    } catch (err) {
      try {
        fs.writeFileSync(rulesPath, JSON.stringify([]));
      } catch (err) {
        callback(err);
      }
    }

    try {
      const buffer = fs.readFileSync(rulesPath);
      const json = JSON.parse(buffer.toString().replaceAll("\u0000", ""));
      json.push(rule);
      fs.writeFileSync(rulesPath, JSON.stringify(json));
      callback();
    } catch (err) {
      callback(err);
    }
  },
  readRules: (callback) => {
    fs.open(rulesPath, "r", (err, fd) =>
      err
        ? err.code === "ENOENT"
          ? callback(null, {})
          : callback(err)
        : fs.read(fd, (err, _, buffer) =>
            err
              ? callback(err)
              : callback(
                  null,
                  JSON.parse(buffer.toString().replaceAll("\u0000", ""))
                )
          )
    );
  },
};
