const adminRouter = require("express").Router();
const AdminController = require("../../controllers/admin/admin.controller");
const GoogleAPI = require("../../controllers/google.api");

adminRouter.get("/dashboard", AdminController.Dashboard);

//profile
adminRouter.get("/profile", AdminController.GetProfile);
adminRouter.post("/profile", AdminController.UpdateProfile);

//business
adminRouter.get("/business", AdminController.GetBusinesses);
adminRouter.get("/business/:id", AdminController.GetBusiness);
adminRouter.post("/business", AdminController.PostBusiness);
adminRouter.post("/editbusiness/:id", AdminController.EditBusiness);
adminRouter.put("/business", AdminController.PutBusiness);

//services
adminRouter.post("/services", AdminController.PostServices);
adminRouter.get("/services/:id", AdminController.GetServices);

//business saffs
adminRouter.post("/bstaffs", AdminController.PostBStaff);

//categories & sub categories
adminRouter.get("/categories", AdminController.getCategories);
adminRouter.get("/subcategories", AdminController.getSubCategories);
adminRouter.get("/subcategories/:id", AdminController.getSubCategory);
adminRouter.post("/categories", AdminController.AddCategory);
adminRouter.patch("/category/:id", AdminController.updateCategory);
adminRouter.delete("/category/:id", AdminController.deleteCategory);

adminRouter.post("/subcategories", AdminController.AddSubCategory);
adminRouter.patch("/subcategory/:id", AdminController.updateSubCategory);
adminRouter.delete("/subcategory/:id", AdminController.deleteSubCategory);

//employees
adminRouter.get("/employees", AdminController.getEmployees);
adminRouter.post("/employees", AdminController.postEmployee);
adminRouter.patch("/employee/:id", AdminController.updateEmployee);
adminRouter.delete("/employee/:id", AdminController.deleteEmployee);
//adminRouter.post("/employees", AdminController.CreateEmployees);

//google apis
adminRouter.get("/getlatlng", GoogleAPI.getLatLng);
adminRouter.get("/getcityname", GoogleAPI.getCityName);

module.exports = adminRouter;
