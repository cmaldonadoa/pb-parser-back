const model = require("../models/authentication.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const utils = require("../utils");

module.exports = {
  authenticate: async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).end();
      return;
    }

    try {
      const hash = await model.getPassword(username);
      const result = await bcrypt.compare(password, hash);
      if (result) {
        const id = await model.getUserId(username);
        const role = await model.getRole(id);
        res.status(200).send(jwt.sign({ role, username }, process.env.JWT_KEY));
      } else {
        res.status(400).end();
      }
    } catch (error) {
      utils.handleError(error);
      res.status(400).end();
      return;
    }
  },
  register: async (req, res) => {
    const { regionId, username, password, roleId } = req.body;

    try {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      await model.storeUser({ username, hash, regionId, roleId });
      res.status(200).end();
    } catch (error) {
      utils.handleError(error);
      res.status(400).end();
      return;
    }
  },
  adminOnly: async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      res.status(401).end();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      if (decoded.role !== "ADMIN") {
        res.status(401).end();
        return;
      }
      const id = await model.getUserId(decoded.username);
      req.userId = id;
      next();
    } catch (error) {
      utils.handleError(error);
      res.status(400).end();
      return;
    }
  },
  reviewerOnly: async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      res.status(401).end();
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      if (decoded.role !== "REVIEWER") {
        res.status(401).end();
        return;
      }
      const id = await model.getUserId(decoded.username);
      req.userId = id;
      next();
    } catch (error) {
      utils.handleError(error);
      res.status(400).end();
      return;
    }
  },
  registeredOnly: async (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) {
      res.status(401).end();
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const id = await model.getUserId(decoded.username);
      if (!id) {
        res.status(401).end();
        return;
      }
      req.userId = id;
      req.role = decoded.role;
      next();
    } catch (error) {
      utils.handleError(error);
      res.status(400).end();
      return;
    }
  },
};
