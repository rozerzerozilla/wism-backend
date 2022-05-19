const Joi = require("joi");
exports.Register = Joi.object({
  name: Joi.string().required().trim().min(3).max(55),
  phone: Joi.string().required().min(10).max(13),
  type: Joi.string().required(),
});

exports.Verify = Joi.object({
  phone: Joi.string().required().min(10).max(13),
  otp: Joi.string().required().min(6).max(6),
  type: Joi.string().required(),
});

exports.Validate = Joi.object({
  clientID: Joi.number().required(),
  token: Joi.string().required().trim(),
  type: Joi.string().required(),
});
