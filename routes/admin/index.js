const routes = require("express").Router();
const jwt = require("../../helpers/jwt.admin");
const auth = require("./admin.auth.routes");
const home = require("./admin.routes");
routes.use("/auth", auth);
routes.use("/home", [jwt.verifyJWT, jwt.VerifyAdmin], home);

module.exports = routes;
