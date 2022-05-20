const validate = require("../../helpers/joi.admin");
const bcrypt = require("bcrypt");
const database = require("../../db");
const createErrors = require("http-errors");
const jwt = require("../../helpers/jwt.admin");
const jwt2 = require("jsonwebtoken");
const AT = process.env.JWT_ADMIN_AT;
exports.Login = async (req, res, next) => {
  console.log(req.body)
  try {
    const userInputs = await validate.Login.validateAsync(req.body);

    //check the phone is already registered with the system
    const [rows] = await database.execute(
      `SELECT id,name,phone,password FROM admin WHERE username = ?`,
      [userInputs.username || ""]
    );
    if (rows.length === 0) {
      throw createErrors.NotFound("user not found!");
    }
    const isPasswordMatch = await bcrypt.compare(
      userInputs.password,
      rows[0].password
    );
    if (!isPasswordMatch)
      throw createErrors.Unauthorized("Username/password do not match!");

    var token = await jwt.createToken(rows[0].id);
    var refreshToken = await jwt.createRefreshToken(rows[0].id);

    if (token) {
      await database.execute(`UPDATE admin SET token = ? WHERE id = ?`, [
        token,
        rows[0].id,
      ]);
      res.json({
        adminID: rows[0].id,
        name: rows[0].name,
        phone: rows[0].phone,
        token,
        refreshToken,
      });
    } else {
      throw createErrors.InternalServerError(
        "Something went wrong, please try again later"
      );
    }
  } catch (e) {
    console.log(e)
    next(e);
  }
};

exports.Validate = async (req, res, next) => {
  try {
    const userInputs = await validate.Validate.validateAsync(req.body);
    const [rows] = await database.execute(
      `SELECT id FROM admin WHERE id = ? AND token = ?`,
      [userInputs.adminID, userInputs.token]
    );
    if (rows.length === 0) {
      throw createErrors.NotFound("Invalid Details");
    }
    //verify the token
    jwt2.verify(userInputs.token, AT, (error, payload) => {
      if (error) {
        throw createErrors.Unauthorized("Access Denied!");
      }
    });
    res.json({ valid: true });
  } catch (e) {
    next(e);
  }
};
