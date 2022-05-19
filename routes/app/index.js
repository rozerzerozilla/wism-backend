const routes = require("express").Router();
const jwt = require("../../helpers/jwt.app");
const auth = require("./app.auth.routes");
const home = require("./app.routes");
routes.use("/auth", auth);
routes.use("/home", [jwt.verifyJWT, jwt.VerifyAppUser], home);

module.exports = routes;
