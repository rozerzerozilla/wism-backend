const validate = require("../../helpers/joi.client");
const bcrypt = require("bcrypt");
const jwt = require("../../helpers/jwt.client");
const database = require("../../db");
const createErrors = require("http-errors");
const jwt2 = require("jsonwebtoken");
const AT = process.env.JWT_CLIENT_AT;
exports.Register = async (req, res, next) => {
  try {
    const userInputs = await validate.Register.validateAsync(req.body);
    //check the phone is already registered with the system
    const [rows] = await database.execute(
      `SELECT id FROM clients WHERE phone = ?`,
      [userInputs.phone]
    );

    if (rows.length > 0) {
      throw createErrors.Conflict(
        `${userInputs.phone} already exist, please login`
      );
    }

    try {
      //const otp = Math.floor(100000 + Math.random() * 900000);
      const otp = 123456;
      //send the sms to the client

      //get the date
      var today = new Date();
      var dd = String(today.getDate()).padStart(2, "0");
      var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
      var yyyy = today.getFullYear();

      today = dd + "-" + mm + "-" + yyyy;

      const passwordHash = await bcrypt.hash(userInputs.password, 10);
      const insertData = await database.execute(
        `INSERT INTO clients (name, phone, username, password, role, otp, adate) 
      VALUES(?,?,?,?,?,?,?)`,
        [
          userInputs.name,
          userInputs.phone,
          userInputs.phone,
          passwordHash,
          1,
          otp,
          today,
        ]
      );
      if (insertData[0].insertId) {
        // res.json({
        //   name: userInputs.name,
        //   phone: userInputs.phone,
        //   verify: true,
        // });

        var token = await jwt.createToken(insertData[0].insertId);
        var refreshToken = await jwt.createRefreshToken(insertData[0].insertId);

        if (token) {
          await database.execute(
            `UPDATE clients SET token = ?, verified = ? WHERE id = ?`,
            [token, 1, insertData[0].insertId]
          );
          res.json({
            clientID: insertData[0].insertId,
            name: userInputs.name,
            phone: userInputs.phone,
            token,
            refreshToken,
          });
        } else {
          throw createErrors.InternalServerError(
            "Something went wrong, please try again later"
          );
        }
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

exports.Verify = async (req, res, next) => {
  try {
    const userInputs = await validate.Verify.validateAsync(req.body);
    //check the phone and otp is matching
    const [rows] = await database.execute(
      `SELECT id,name FROM clients WHERE phone = ? AND otp = ?`,
      [userInputs.phone, userInputs.otp]
    );

    if (!rows.length > 0) {
      throw createErrors.Conflict(`OTP not valid, please try again!`);
    }

    try {
      var token = await jwt.createToken(rows[0].id);
      var refreshToken = await jwt.createRefreshToken(rows[0].id);

      if (token) {
        await database.execute(
          `UPDATE clients SET token = ?, verified = ?, otp = ? WHERE id = ?`,
          [token, 1, null, rows[0].id]
        );
        res.json({
          clientID: rows[0].id,
          name: rows[0].name,
          phone: userInputs.phone,
          token,
          refreshToken,
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

exports.Login = async (req, res, next) => {
  try {
    const userInputs = await validate.Login.validateAsync(req.body);

    //check the phone is already registered with the system
    const [rows] = await database.execute(
      `SELECT id,name,phone,email,password,verified,token,role FROM clients WHERE username = ?`,
      [userInputs.username]
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

    if (!rows[0].verified) {
      res.json({
        name: rows[0].name,
        phone: rows[0].phone,
        verify: true,
      });
      return;
    }

    var token = await jwt.createToken(rows[0].id);
    var refreshToken = await jwt.createRefreshToken(rows[0].id);

    if (token) {
      await database.execute(`UPDATE clients SET token = ? WHERE id = ?`, [
        token,
        rows[0].id,
      ]);
      res.json({
        clientID: rows[0].id,
        name: rows[0].name,
        phone: rows[0].phone,
        token,
        refreshToken,
        role: rows[0].role,
      });
    } else {
      throw createErrors.InternalServerError(
        "Something went wrong, please try again later"
      );
    }
  } catch (e) {
    next(e);
  }
};

exports.Validate = async (req, res, next) => {
  try {
    const userInputs = await validate.Validate.validateAsync(req.body);
    const [rows] = await database.execute(
      `SELECT id FROM clients WHERE id = ? AND token = ?`,
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
