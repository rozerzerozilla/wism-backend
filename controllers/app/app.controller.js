const validate = require("../../helpers/joi.app");
const database = require("../../db");
const path = require("path");
//const URL = "http://localhost:5000/";

const URL = "https://api.wism.in/";

const createErrors = require("http-errors");
const bcrypt = require("bcrypt");
const { Client } = require("@googlemaps/google-maps-services-js");
const QRCode = require("qrcode");

exports.Dashboard = (req, res, next) => {
  res.json("welcome to mobile app dashboard");
};
