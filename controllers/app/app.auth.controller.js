const validate = require("../../helpers/joi.app");
const bcrypt = require("bcrypt");
const jwt = require("../../helpers/jwt.app");
const database = require("../../db");
const createErrors = require("http-errors");
const jwt2 = require("jsonwebtoken");
const AT = process.env.JWT_CLIENT_AT;
exports.Register = async (req, res, next) => {
  try {
    const userInputs = await validate.Register.validateAsync(req.body);

    //check the phone is already registered with the system
    const table = parseInt(userInputs.type) === 1 ? "clients" : "users";
    //check users found, if found update or else add
    const [rows] = await database.execute(
      `SELECT id FROM ${table} WHERE phone = ?`,
      [userInputs.phone]
    );

    //check user already register, if they do don't change the password or else update the password
    //const otp = Math.floor(100000 + Math.random() * 900000);
    const otp = 123456;
    if (rows.length > 0) {
      addUser(
        table,
        parseInt(userInputs.type),
        userInputs.name,
        userInputs.phone,
        otp,
        true,
        next,
        res
      );
    } else {
      addUser(
        table,
        userInputs.type,
        userInputs.name,
        userInputs.phone,
        otp,
        false,
        next,
        res
      );
    }
  } catch (e) {
    next(e);
  }
};

//OTP & PHONE NUMBER VERIFICATION
exports.Verify = async (req, res, next) => {
  try {
    const userInputs = await validate.Verify.validateAsync(req.body);
    //check the phone is already registered with the system
    const table = parseInt(userInputs.type) === 1 ? "clients" : "users";
    //check the phone and otp is matching
    const [rows] = await database.execute(
      `SELECT id,name FROM ${table} WHERE phone = ? AND otp = ?`,
      [userInputs.phone, userInputs.otp]
    );

    if (!rows.length > 0) {
      throw createErrors.Conflict(`OTP not valid, please try again!`);
    }

    try {
      var token = await jwt.createToken(rows[0].id);
      if (token) {
        await database.execute(
          `UPDATE ${table} SET token = ?, verified = ?, otp = ? WHERE id = ?`,
          [token, 1, "", rows[0].id]
        );
        res.json({
          clientID: rows[0].id,
          name: rows[0].name,
          phone: userInputs.phone,
          token,
          type: parseInt(userInputs.type),
        });
      } else {
        throw createErrors.InternalServerError(
          "Something went wrong, please try again later"
        );
      }
    } catch (e) {
      next(e);
    }
  } catch (e) {
    next(e);
  }
};

//VALIDATE THE USER/CLIENT WITH THEIR AND ID AND TOKEN
exports.Validate = async (req, res, next) => {
  try {
    const userInputs = await validate.Validate.validateAsync(req.body);
    //check the phone is already registered with the system
    const table = parseInt(userInputs.type) === 1 ? "clients" : "users";
    const [rows] = await database.execute(
      `SELECT id FROM ${table} WHERE id = ? AND token = ?`,
      [userInputs.clientID, userInputs.token]
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

//ADD OR UPDATE THE USER TO THE DATABASE
async function addUser(table, type, name, phone, otp, update, next, res) {
  try {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + "-" + mm + "-" + yyyy;
    if (update) {
      const insertData = await database.execute(
        `UPDATE ${table} SET name = ?, otp= ?`,
        [name, otp]
      );
      if (insertData[0].affectedRows) {
        res.json({
          name: name,
          phone: phone,
          otp: otp,
          type: type,
        });
      } else {
        throw createErrors.InternalServerError(
          "Something went wrong, please try again later"
        );
      }
    } else {
      const passwordHash = await bcrypt.hash(phone, 10);
      const insertData = await database.execute(
        `INSERT INTO ${table} (name, phone, username, password, otp, adate) 
        VALUES(?,?,?,?,?,?,?)`,
        [name, phone, phone, passwordHash, otp, today]
      );
      if (insertData[0].insertId) {
        res.json({
          name: name,
          phone: phone,
          otp: otp,
        });
      } else {
        throw createErrors.InternalServerError(
          "Something went wrong, please try again later"
        );
      }
    }
  } catch (e) {
    next(e);
  }
}
