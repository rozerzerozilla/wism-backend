const authRoutes = require("express").Router();
const cac = require("../../controllers/clients/client.auth.controller");

authRoutes.post("/register", cac.Register);
authRoutes.post("/verify", cac.Verify);
authRoutes.post("/login", cac.Login);
authRoutes.post("/validate", cac.Validate);

module.exports = authRoutes;
