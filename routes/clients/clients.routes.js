const clientRoutes = require("express").Router();
const clientController = require("../../controllers/clients/clients.controller");
const GoogleAPI = require("../../controllers/google.api");
clientRoutes.get("/dashboard", clientController.Dashboard);
clientRoutes.get("/business", clientController.GetBusiness);
clientRoutes.get("/services", clientController.GetServices);
clientRoutes.get("/staff", clientController.GetStaff);
clientRoutes.get("/staff/:id", clientController.GetStaffDetails);
clientRoutes.get("/customform", clientController.GetCustomForm);
clientRoutes.get("/tokens", clientController.GetTokens);
clientRoutes.get("/qrcodes", clientController.GetQRCodes);

clientRoutes.post("/business", clientController.PostBusiness);
clientRoutes.post("/editbusiness", clientController.EditBusiness);
clientRoutes.post("/services", clientController.PostServices);
clientRoutes.post("/staff", clientController.PostStaff);
clientRoutes.post("/customform", clientController.PostCustomForm);
clientRoutes.post("/tokens", clientController.UpdateTokens);

clientRoutes.put("/staff", clientController.UpdateStaff);
clientRoutes.put("/editstaff/:id", clientController.EditStaff);
clientRoutes.delete("/staff/:id", clientController.deleteStaff);

clientRoutes.put("/tokens/:id", clientController.UpdateToken);

clientRoutes.delete("/services/:id", clientController.DeleteServices);
clientRoutes.delete("/customform/:id", clientController.DeleteCustomForm);

//google apis
clientRoutes.get("/getlatlng", GoogleAPI.getLatLng);
clientRoutes.get("/getcityname", GoogleAPI.getCityName);

module.exports = clientRoutes;
