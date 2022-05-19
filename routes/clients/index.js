const routes = require("express").Router();
const jwt = require("../../helpers/jwt.client");
const auth = require("./clients.auth.routes");
const home = require("./clients.routes");
routes.use("/auth", auth);
routes.use("/home", [jwt.verifyJWT, jwt.VerifyClients], home);

module.exports = routes;
