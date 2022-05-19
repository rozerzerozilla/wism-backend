const appRoutes = require("express").Router();
const appController = require("../../controllers/app/app.controller");
appRoutes.get("/dashboard", appController.Dashboard);

module.exports = appRoutes;
