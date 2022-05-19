const homeRoutes = require("express").Router();
const HomeController = require("../../controllers/home/home.controller");
const GoogleAPI = require("../../controllers/google.api");
homeRoutes.get("/home", HomeController.GetHome);
homeRoutes.get("/categories", HomeController.Categories);
homeRoutes.get("/subcategories", HomeController.getSubCategories);
homeRoutes.get("/homecategories", HomeController.homeCategories);
homeRoutes.get("/homecategories/:id", HomeController.homeCategory);
homeRoutes.get("/subcategories/:id", HomeController.getSubCategory);
homeRoutes.get("/businesses", HomeController.getBusinesses);
homeRoutes.get("/businesses/:id", HomeController.getBusiness);
homeRoutes.get("/gettimeslot", HomeController.getTimeSlot);
homeRoutes.post("/tokens", HomeController.postToken);

//search business
homeRoutes.get("/search", HomeController.getSearch);
homeRoutes.get("/getcityname", GoogleAPI.getCityName);
homeRoutes.get("/getdistance", GoogleAPI.getDistance);

module.exports = homeRoutes;
