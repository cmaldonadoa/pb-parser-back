const model = require("../models/authentication.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  authenticate: (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.end();
      return;
    }

    model.getPassword(username, (err, hash) => {
      if (err) {
        res.end();
        return;
      }
      bcrypt.compare(password, hash, (err, result) => {
        if (err) {
          res.end();
          return;
        }
        if (result) {
          model.getUserId(username, (err, id) => {
            if (err) {
              res.end();
              return;
            }
            model.getRole(id, (err, role) => {
              if (err) {
                res.end();
                return;
              }
              res.send(jwt.sign({ role, username }, process.env.JWT_KEY));
            });
          });
        } else {
          res.end();
        }
      });
    });
  },
  register: (req, res) => {
    const { regionId, username, password, roleId } = req.body;

    bcrypt.genSalt(10, (err, salt) => {
      if (err) {
        res.end();
        return;
      }
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
          res.end();
          return;
        }
        model.storeUser({ username, hash, regionId, roleId }, () => {
          res.end();
        });
      });
    });
  },
  adminOnly: (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      res.status(401).end();
      return;
    }

    jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
      if (err) {
        res.status(401).end();
        return;
      }

      if (decoded.role !== "ADMIN") {
        res.status(401).end();
        return;
      }

      model.getUserId(decoded.username, (err, id) => {
        if (err) {
          res.status(401).end();
          return;
        }

        req.userId = id;
        next();
      });
    });
  },
  reviewerOnly: (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      res.status(401).end();
      return;
    }

    jwt.verify(token, process.env.JWT_KEY, (err, decoded) => {
      if (err) {
        res.status(401).end();
        return;
      }

      if (decoded.role !== "REVIEWER") {
        res.status(401).end();
        return;
      }

      model.getUserId(decoded.username, (err, id) => {
        if (err) {
          res.status(401).end();
          return;
        }

        req.userId = id;
        next();
      });
    });
  },
};
