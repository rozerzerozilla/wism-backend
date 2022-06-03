const validate = require("../../helpers/joi.client");
const bcrypt = require("bcrypt");
const jwt = require("../../helpers/jwt.client");
const {OTP_generator, addMinutesToDate} = require("../../helpers/utils");
const database = require("../../db");
const createErrors = require("http-errors");
const jwt2 = require("jsonwebtoken");
const AT = process.env.JWT_CLIENT_AT;
const Vonage = require('@vonage/server-sdk');
const fast2sms = require('fast-two-sms');
const axios = require('axios');

const vonage = new Vonage({
  apiKey: "0af906ec",
  apiSecret: "O5MpXy9NUlQElMuZ"
},{
  debug: true
})


exports.otpCreate = async (req, res, next) => {
  try {
    const userInputs = req.body;
    const [rows] = await database.execute(
      `SELECT id FROM clients WHERE phone = ?`,
      [userInputs.phone]
    );
    if (rows.length > 0) {
      throw createErrors.Conflict(`${userInputs.phone} already exist, please login`);
    }
    const otp = Math.floor(1000 + Math.random() * 9000);
    // const resdata = await axios.get(`https://msg2all.com/TRANSAPI/sendsms.jsp?login=maruthi&passwd=maruthi@321&version=v1.0&msisdn=0${req.body.phone}&msg_type=text&msg=Your OTP is : ${otp} . Please Validate the OTP to continue. - Sri Maruthi Rock Drillers&sender_id=SRIMRD`);
    const ratsms = await axios.get(`https://login.ratsms.com/api/smsapi?key=0dc3967ab08024a3b64ba9b31859bd50&route=9&sender=WISMAP&number=${req.body.phone}&sms=Message&templateid=1507164969494869075`)
    // const resCode = resdata.data.result.status;
    console.log(ratsms);
    if (ratsms) {
      var today = new Date();
      const now = new Date();
      const expiration_time = addMinutesToDate(now, 10);
      const insertData = await database.execute(
        `INSERT INTO otps (otp, expireTime, phone)
        VALUES(?,?,?)`,
        [otp, expiration_time, userInputs.phone]
      );
      if (insertData[0].insertId) {  
        res.status(200).send({
          message: 'OTP sent successfully to your register mobile number : ' + userInputs.phone,
          responseStatus: 1,
          otp: otp,
          id: insertData[0].insertId
        });
      }
        
    } else {
      if (resCode.errorCode == 120) {
        res.status(404).send({ message: 'Invalid Mobile Number.', responseStatus: 0 });
      } else {
        res.status(404).send({ message: 'Something went wrong, Try after sometime.', responseStatus: 0 });
      }
    }
  } catch (error) {
    console.log(error)
    next(error)
  }
}

exports.verifyOtp = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    const userInputs = req.body;
    const [rows] = await database.execute(
      `SELECT * FROM otps WHERE id = ?`,
      [id]
    );
    if (rows.length <= 0) {
      throw createErrors.Conflict(`No data found`);
    }
    if (rows[0].otp == userInputs.otp) {
      const existExpireTime = new Date(rows[0].expireTime).getTime();
      const presentExpireTime = new Date().getTime();
      if (existExpireTime === presentExpireTime) {
        res.status(500).send({ message: 'Time expired', validated: 0 });
      } else {
        res.status(200).send({ message: 'OTP validated successfully for mobile number ', validated: 1 });
      }
    } else {
      res.status(501).send({ message: 'Wrong Otp', validated: 0 });
    }
  } catch (error) {
    console.log(error)
    next(error)
  }
}

exports.OTPGenarator = async (req, res, next) => {

  try {
    // const otp = OTP_generator();
    // var options = {
    //   authorization: "9mixX2dbk1ceDgTHGMI6slW8UON5Qq3yEF7nBSjftKphPArZua8ejuIZQAmKEqNxPVf7whBnOCFy6kHb",
    //   message: otp,
    //   numbers: ['8050849022', '7787995794']
    // }
    // fast2sms.sendMessage(options);
    // res.send({ message: "send sucessfully" });


    // const [rows] = await database.execute(
    //   `SELECT id FROM clients WHERE phone = ?`,
    //   [userInputs.phone]
    // );
    // if (rows.length > 0) {
    //   throw createErrors.Conflict(`${userInputs.phone} already exist, please login`);
    // }

    const from = "8050849022"
    const to = `918050849022`
    const text = 'A text message sent using the Vonage SMS API'

    console.log("api for otpgen")


    await vonage.message.sendSms(from, to, text, (err, responseData) => {
      if (err) {
        console.log(err);
      } else {
        if (responseData.messages[0]['status'] === "0") {
          console.log("Message sent successfully.");
          return res.send({ message: responseData.messages[0] });
        } else {
          console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
          return res.send({ message: responseData.messages[0]['error-text'] });
        }
      }
    })
    // const otp = OTP_generator();
    // const now = new Date();
    // const expiration_time = addMinutesToDate(now, 10);
    // const passwordHash = await bcrypt.hash(userInputs.phone, 8);
    // const insertData = await database.execute(
    //   `INSERT INTO clients (name, phone, username, password, role, otp, adate, OTPexpirationTime) 
    //   VALUES(?,?,?,?,?,?,?)`,
    //   [
    //     userInputs.name,
    //     userInputs.phone,
    //     userInputs.phone,
    //     passwordHash,
    //     1,
    //     otp,
    //     today,
    //     expiration_time
    //   ]
    // );
    // if (insertData[0].insertId) {
    //   res.status(200).send({otp:otp})
    // }
  } catch (error) {
    
  }
}


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

      const passwordHash = await bcrypt.hash(userInputs.phone, 10);
      const insertData = await database.execute(
        `INSERT INTO clients (name, phone, username, password, role, otp, adate) VALUES(?,?,?,?,?,?,?)`,
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
