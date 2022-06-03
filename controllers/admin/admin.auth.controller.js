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

exports.Register = async (req, res, next) => {
  try {
    // const userInputs = await validate.Register.validateAsync(req.body);
    const userInputs = req.body;
    //check the phone is already registered with the system
    const [rows] = await database.execute(
      `SELECT id FROM admin WHERE phone = ?`,
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

      const passwordHash = await bcrypt.hash(userInputs.password, 8);
      const insertData = await database.execute(
        `INSERT INTO admin (name, email, phone, username, password, activated, role, adate) VALUES(?,?,?,?,?,?,?,?)`,
        [
          userInputs.name,
          userInputs.email,
          userInputs.phone,
          userInputs.phone,
          passwordHash,
          1,
          userInputs.role,
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
            `UPDATE admin SET token = ?, activated = ? WHERE id = ?`,
            [token, 1, insertData[0].insertId]
          );
          res.json({
            clientID: insertData[0].insertId,
            name: userInputs.name,
            phone: userInputs.phone,
            email: userInputs.email,
            admin: userInputs.role === 1 ? "admin" : "staff",
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
      console.log(e)
      next(e);
    }
  } catch (e) {
    console.log(e)
    next(e);
  }
};
