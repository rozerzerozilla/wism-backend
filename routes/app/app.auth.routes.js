const authRoutes = require("express").Router();
const cac = require("../../controllers/app/app.auth.controller");

authRoutes.post("/register", cac.Register);
authRoutes.post("/verify", cac.Verify);
authRoutes.post("/validate", cac.Validate);

module.exports = authRoutes;
