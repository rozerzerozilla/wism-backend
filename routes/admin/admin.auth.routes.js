const authRoutes = require("express").Router();
const auc = require("../../controllers/admin/admin.auth.controller");

authRoutes.post("/login", auc.Login);
authRoutes.post("/register", auc.Register);
authRoutes.post("/validate", auc.Validate);

module.exports = authRoutes;
