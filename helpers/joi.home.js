const Joi = require("joi");
exports.AddToken = Joi.object({
  mode: Joi.string().required().trim(),
  name: Joi.string().required().min(3).max(20).trim(),
  phone: Joi.string().required().min(10).max(14).trim(),
  service: Joi.number().required(),
  time: Joi.string().required().trim(),
  business_id: Joi.any(),
  client_id: Joi.any(),
  options: Joi.any(),
});
