const Joi = require("joi");
exports.Register = Joi.object({
  name: Joi.string().required().trim().min(3).max(55),
  phone: Joi.string().required().min(10).max(13),
  password: Joi.string().required().min(6).max(55),
});

exports.Verify = Joi.object({
  phone: Joi.string().required().min(10).max(13),
  otp: Joi.string().required().min(6).max(6),
});

exports.Login = Joi.object({
  username: Joi.string().required().min(10).max(13),
  password: Joi.string().required().min(6).max(55),
});

exports.Validate = Joi.object({
  clientID: Joi.number().required(),
  token: Joi.string().required().trim(),
});

exports.AddService = Joi.object({
  name: Joi.string().required().min(3).max(20).trim(),
  description: Joi.string().required().min(6).max(60).trim(),
  prefix: Joi.string().trim().required().max(1),
  service_time: Joi.number().required(),
});

exports.AddStaff = Joi.object({
  name: Joi.string().required().min(3).max(55).trim(),
  phone: Joi.string().required().min(10).max(13).trim(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(100)
    .allow("")
    .trim(),
  username: Joi.string().required().min(10).max(13),
  password: Joi.string().min(6).max(15),
  services: Joi.any(),
  break_time: Joi.any(),
  role: Joi.any(),
});

exports.EditStaff = Joi.object({
  name: Joi.string().required().min(3).max(55).trim(),
  phone: Joi.string().required().min(10).max(13).trim(),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(100)
    .allow("")
    .trim(),
  services: Joi.any(),
  break_time: Joi.any(),
  role: Joi.any(),
});

exports.AddCustomForm = Joi.object({
  name: Joi.string().required().min(2).max(50).trim(),
  type: Joi.string().required().trim(),
  is_required: Joi.number().required(),
  given_values: Joi.string().allow("").max(150).trim(),
  def_values: Joi.string().allow("").max(150).trim(),
});

exports.AddBusiness = Joi.object({
  bname: Joi.string().required().min(3).max(100).trim().label("Business Name"),
  telephone: Joi.string()
    .required()
    .min(8)
    .max(15)
    .trim()
    .label("Business Phone Number"),
  website: Joi.string().max(100).trim().allow(""),
  info: Joi.string().max(250).trim().allow(""),
  photo: Joi.any(),
  ad1: Joi.any(),
  ad2: Joi.any(),
  address1: Joi.string()
    .required()
    .min(3)
    .max(150)
    .trim()
    .label("Business Address1"),
  address2: Joi.string().allow("").max(150).trim().label("Business Address2"),
  street: Joi.string().allow("").max(150).trim(),
  city: Joi.string().required().max(50).trim(),
  state: Joi.string().required().max(50).trim(),
  postalcode: Joi.string().required().max(10).trim(),
  lat: Joi.string()
    .required()
    .trim()
    .allow("")
    .label("Business Address Latitude"),
  lng: Joi.string()
    .required()
    .trim()
    .allow("")
    .label("Business Address Longitude"),
  category: Joi.string().required().trim(),
  subcategories: Joi.any(),
  open_all_time: Joi.any(),
  monday: Joi.any(),
  tuesday: Joi.any(),
  wednesday: Joi.any(),
  thursday: Joi.any(),
  friday: Joi.any(),
  saturday: Joi.any(),
  sunday: Joi.any(),
  holidays: Joi.any(),
  holidays_working: Joi.any(),
  allTime: Joi.any(),
});
