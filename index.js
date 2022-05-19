const express = require("express");
require("dotenv").config({ path: "./.env" });
const cors = require("cors");
const createErrors = require("http-errors");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const clientRoutes = require("./routes/clients");
const adminRoutes = require("./routes/admin");

//home routes
const homeRoutes = require("./routes/home/home.routes");

//app routes
const appRoutes = require("./routes/app");

const PORT = process.env.PORT || 5500;
const app = express();

app.use(helmet());
//parse the requests
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ extended: true }));

//midleware for fileupload
app.use(fileUpload());

//set static view
app.use(express.static("assets/images"));

//starting page
app.get("/", (req, res) => {
  return res.json({ message: "Welcome to WiSM" });
});

//public routes
app.use("/api/public", homeRoutes);

//all clients requests routes
app.use("/api/clients", clientRoutes);

//all admin request routes
app.use("/api/admin", adminRoutes);

//all app request routes
app.use("/api/app", appRoutes);

//middleware for parsing the error
app.use((req, res, next) => {
  next(createErrors.NotFound("NOT FOUND!"));
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      status: error.status || 500,
      message: error.message || "Resource not found!",
    },
  });
});

app.listen(PORT, () => console.log(`server started...`));
