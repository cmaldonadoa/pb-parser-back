const fs = require("fs");

const infoPath = (uuid) => `${__dirname}/../../files/${uuid}/info.json`;

module.exports = {
  saveInfo: (data, callback) => {
    fs.open(infoPath(data.uuid), "w", (err, fd) =>
      err
        ? callback(err)
        : fs.write(fd, data.info, (err, data) =>
            err ? callback(err) : callback(null, data)
          )
    );
  },
  readInfo: (data, callback) => {
    fs.open(infoPath(data.uuid), "r", (err, fd) =>
      err
        ? callback(err)
        : fs.read(fd, (err, _, buffer) =>
            err
              ? callback(err)
              : callback(
                  null,
                  JSON.parse(buffer.toString().replace(/\u0000/g, ""))
                )
          )
    );
  },
};
