const validate = require("../../helpers/joi.client");
const database = require("../../db");
const path = require("path");
//const URL = "http://localhost:5500/";

const URL = "https://api.wism.in/";

const createErrors = require("http-errors");
const bcrypt = require("bcrypt");
const { Client } = require("@googlemaps/google-maps-services-js");
const QRCode = require("qrcode");

exports.Dashboard = (req, res, next) => {
  res.json("welcome to dashboard");
};

exports.GetBusiness = async (req, res, next) => {
  const view = parseInt(req.query.view)
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business!");
    }

    //fetch the data from tables

    const id = parseInt(req.params.id);
    //fetch the data from tables
    const [client] = view === 1 ? await database.query(
      `SELECT business.id, business.name as bname,business.id as bid, business.telephone, business.website,business.info,
      business.ad1,business.ad2,business.address1,business.address2,business.street,
      business.city,business.state,business.postalcode,business.lat,business.lng, business.subcategories,
      business.photo as image,business.status, business.open_all_time, categories.name as category, 
      holidays.holidays,holidays.holiday_work_from,holidays.holiday_work_to FROM 
      business LEFT JOIN categories ON 
      categories.id = business.category 
      LEFT JOIN holidays ON holidays.business_id = business.id
      WHERE business.id = ${exists[0].business_id}`
    ) :
      await database.query(
        `SELECT business.id, business.name as bname,business.id as bid, business.telephone, business.website,business.info,
      business.ad1,business.ad2,business.address1,business.address2,business.street,
      business.city,business.state,business.postalcode,business.lat,business.lng, business.subcategories,
      business.photo as image,business.status, business.open_all_time, categories.id as category, 
      holidays.holidays,holidays.holiday_work_from,holidays.holiday_work_to FROM 
      business LEFT JOIN categories ON 
      categories.id = business.category 
      LEFT JOIN holidays ON holidays.business_id = business.id
      WHERE business.id = ${exists[0].business_id}`
      );

    if (client[0].subcategories) {
      const subCategories = client[0].subcategories.split(",");
      const [subCatNames] = await database.query(
        `SELECT id, name FROM subcategories WHERE id IN (${subCategories})`
      );
      client[0].subcats = subCatNames;
    }

    if (client[0].holidays) {
      client[0].holidays = JSON.parse(client[0].holidays);
    }

    //select timings
    const [timings] =
      await database.query(`SELECT day,work_from,work_to,break_from,break_to FROM timings 
    WHERE business_id = ${exists[0].business_id}`);
    client[0].timings = timings;

    res.json(client[0]);
  } catch (e) {
    next(e);
  }
};

exports.PostBusiness = async (req, res, next) => {
  try {
    //get the user
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length > 0) {
      throw createErrors.NotAcceptable("You already added the business");
    }
    const userInputs = await validate.AddBusiness.validateAsync(req.body);

    //parse the json
    userInputs.monday = JSON.parse(userInputs.monday);
    userInputs.tuesday = JSON.parse(userInputs.tuesday);
    userInputs.wednesday = JSON.parse(userInputs.wednesday);
    userInputs.thursday = JSON.parse(userInputs.thursday);
    userInputs.friday = JSON.parse(userInputs.friday);
    userInputs.saturday = JSON.parse(userInputs.saturday);
    userInputs.sunday = JSON.parse(userInputs.sunday);
    userInputs.holidays_working = JSON.parse(userInputs.holidays_working);

    //get the district from google API
    const results = await funGetCityName(userInputs.lat, userInputs.lng);
    var dist;
    if (results.status) {
      dist = results?.address.city;
    }
    //add the business
    //insert the business details
    const insertBusiness = await database.execute(
      `INSERT INTO business 
      (name, telephone, website, info,address1, address2, street, 
        city,districts, state,postalcode,lat,lng,category,subcategories,open_all_time) 
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userInputs.bname || "",
        userInputs.telephone || "",
        userInputs.website || "",
        userInputs.info || "",
        userInputs.address1 || "",
        userInputs.address2 || "",
        userInputs.street || "",
        userInputs.city || "",
        dist || userInputs.city || "",
        userInputs.state || "",
        userInputs.postalcode || "",
        userInputs.lat || "",
        userInputs.lng || "",
        userInputs.category || "",
        JSON.stringify(userInputs.subcategories),
        JSON.parse(userInputs.open_all_time) ? 1 : 0,
      ]
    );

    if (insertBusiness[0].insertId) {
      //insert the subcategories seperate table
      if (userInputs.subcategories) {
        const inpuCat = userInputs.subcategories.split(",");
        var subCats = [];
        inpuCat.map((subcat) =>
          subCats.push([insertBusiness[0].insertId, parseInt(subcat)])
        );
        var subCatquery =
          "INSERT INTO business_subcat(business_id,subcat_id) VALUES ?";
        await database.query(subCatquery, [subCats]);
      }

      //update the client, set business ID
      await database.execute(
        `INSERT INTO business_clients(business_id,client_id) 
      VALUES(?,?)`,
        [insertBusiness[0].insertId, dataFound[0].id]
      );
      //save the images
      if (req.files) {
        if (req.files.photo) {
          saveFiles(
            req.files.photo,
            "business",
            "photo",
            insertBusiness[0].insertId
          );
        }
        if (req.files.ad1) {
          saveFiles(
            req.files.ad1,
            "business",
            "ad1",
            insertBusiness[0].insertId
          );
        }
        if (req.files.ad2) {
          saveFiles(
            req.files.ad2,
            "business",
            "ad2",
            insertBusiness[0].insertId
          );
        }
      }

      //save the timings
      let values = [
        [
          insertBusiness[0].insertId,
          "Monday",
          userInputs.monday.monday_work_from || "",
          userInputs.monday.monday_work_to || "",
          userInputs.monday.monday_break_from || "",
          userInputs.monday.monday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Tuesday",
          userInputs.tuesday.tuesday_work_from || "",
          userInputs.tuesday.tuesday_work_to || "",
          userInputs.tuesday.tuesday_break_from || "",
          userInputs.tuesday.tuesday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Wednesday",
          userInputs.wednesday.wednesday_work_from || "",
          userInputs.wednesday.wednesday_work_to || "",
          userInputs.wednesday.wednesday_break_from || "",
          userInputs.wednesday.wednesday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Thursday",
          userInputs.thursday.thursday_work_from || "",
          userInputs.thursday.thursday_work_to || "",
          userInputs.thursday.thursday_break_from || "",
          userInputs.thursday.thursday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Friday",
          userInputs.friday.friday_work_from || "",
          userInputs.friday.friday_work_to || "",
          userInputs.friday.friday_break_from || "",
          userInputs.friday.friday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Saturday",
          userInputs.saturday.saturday_work_from || "",
          userInputs.saturday.saturday_work_to || "",
          userInputs.saturday.saturday_break_from || "",
          userInputs.saturday.saturday_break_to || "",
        ],
        [
          insertBusiness[0].insertId,
          "Sunday",
          userInputs.sunday.sunday_work_from || "",
          userInputs.sunday.sunday_work_to || "",
          userInputs.sunday.sunday_break_from || "",
          userInputs.sunday.sunday_break_to || "",
        ],
      ];
      var query =
        "INSERT INTO timings(business_id,day,work_from,work_to,break_from,break_to) VALUES ?";
      await database.query(query, [values]);

      await database.execute(
        `INSERT INTO holidays(business_id,holidays,holiday_work_from,holiday_work_to)
      VALUES(?,?,?,?)
      `,
        [
          insertBusiness[0].insertId,
          JSON.stringify(userInputs.holidays),
          userInputs.holidays_working.holiday_work_from,
          userInputs.holidays_working.holiday_work_to,
        ]
      );

      const convertString = `'${insertBusiness[0].insertId}${userInputs.bname}'`;
      //insert the qrcode
      const QRCode = await generateQR(convertString);
      await database.execute(
        `INSERT INTO business_qrcode(business_id,qrcode)
       VALUES(?,?)`,
        [insertBusiness[0].insertId, QRCode ? QRCode : ""]
      );

      res.json({ message: "Successfully added the business" });
    }
  } catch (e) {
    next(e);
  }
};

exports.EditBusiness = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT * FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("You haven't added any business");
    }

    const userInputs = await validate.AddBusiness.validateAsync(req.body);

    userInputs.monday = JSON.parse(userInputs.monday);
    userInputs.tuesday = JSON.parse(userInputs.tuesday);
    userInputs.wednesday = JSON.parse(userInputs.wednesday);
    userInputs.thursday = JSON.parse(userInputs.thursday);
    userInputs.friday = JSON.parse(userInputs.friday);
    userInputs.saturday = JSON.parse(userInputs.saturday);
    userInputs.sunday = JSON.parse(userInputs.sunday);
    userInputs.holidays_working = JSON.parse(userInputs.holidays_working);

    //get the district from google API
    const results = await funGetCityName(userInputs.lat, userInputs.lng);
    var dist;
    if (results.status) {
      dist = results?.address.city;
    }

    const updateBusiness = await database.execute(
      `UPDATE business SET 
      name = ?, telephone=?, website=?, info=?,address1=?, address2=?, street=?, 
        city=?,districts=?, state=?,postalcode=?,lat=?,lng=?,category=?,
        subcategories=?,open_all_time=? WHERE id = ?`,
      [
        userInputs.bname || exists[0].bname || "",
        userInputs.telephone || exists[0].telephone || "",
        userInputs.website || exists[0].website || "",
        userInputs.info || exists[0].info || "",
        userInputs.address1 || exists[0].address1 || "",
        userInputs.address2 || exists[0].address2 || "",
        userInputs.street || exists[0].street || "",
        userInputs.city || exists[0].city || "",
        dist || userInputs.city || exists[0].city || "",
        userInputs.state || exists[0].state || "",
        userInputs.postalcode || exists[0].postalcode || "",
        userInputs.lat || exists[0].lat || "",
        userInputs.lng || exists[0].lng || "",
        userInputs.category.toString() || exists[0].category || "",
        userInputs.subcategories
          ? userInputs.subcategories
          : exists[0].subcategories || "",
        JSON.parse(userInputs.open_all_time) ? 1 : 0,
        exists[0].id,
      ]
    );

    if (updateBusiness[0].affectedRows) {
      if (userInputs.subcategories) {
        //delete earlier subcategories
        await database.query(
          `DELETE FROM business_subcat WHERE business_id = ${exists[0].id}`
        );
        const inpuCat = userInputs.subcategories.split(",");
        var subCats = [];
        inpuCat.map((subcat) => subCats.push([exists[0].id, parseInt(subcat)]));
        var subCatquery =
          "INSERT INTO business_subcat(business_id,subcat_id) VALUES ?";
        await database.query(subCatquery, [subCats]);
      }

      //save the images
      if (req.files) {
        if (req.files.photo) {
          saveFiles(req.files.photo, "business", "photo", exists[0].id);
        }
        if (req.files.ad1) {
          saveFiles(req.files.ad1, "business", "ad1", exists[0].id);
        }
        if (req.files.ad2) {
          saveFiles(req.files.ad2, "business", "ad2", exists[0].id);
        }
      }

      //save the timings
      let values = [
        [
          exists[0].id,
          "Monday",
          userInputs.monday.monday_work_from || "",
          userInputs.monday.monday_work_to || "",
          userInputs.monday.monday_break_from || "",
          userInputs.monday.monday_break_to || "",
        ],
        [
          exists[0].id,
          "Tuesday",
          userInputs.tuesday.tuesday_work_from || "",
          userInputs.tuesday.tuesday_work_to || "",
          userInputs.tuesday.tuesday_break_from || "",
          userInputs.tuesday.tuesday_break_to || "",
        ],
        [
          exists[0].id,
          "Wednesday",
          userInputs.wednesday.wednesday_work_from || "",
          userInputs.wednesday.wednesday_work_to || "",
          userInputs.wednesday.wednesday_break_from || "",
          userInputs.wednesday.wednesday_break_to || "",
        ],
        [
          exists[0].id,
          "Thursday",
          userInputs.thursday.thursday_work_from || "",
          userInputs.thursday.thursday_work_to || "",
          userInputs.thursday.thursday_break_from || "",
          userInputs.thursday.thursday_break_to || "",
        ],
        [
          exists[0].id,
          "Friday",
          userInputs.friday.friday_work_from || "",
          userInputs.friday.friday_work_to || "",
          userInputs.friday.friday_break_from || "",
          userInputs.friday.friday_break_to || "",
        ],
        [
          exists[0].id,
          "Saturday",
          userInputs.saturday.saturday_work_from || "",
          userInputs.saturday.saturday_work_to || "",
          userInputs.saturday.saturday_break_from || "",
          userInputs.saturday.saturday_break_to || "",
        ],
        [
          exists[0].id,
          "Sunday",
          userInputs.sunday.sunday_work_from || "",
          userInputs.sunday.sunday_work_to || "",
          userInputs.sunday.sunday_break_from || "",
          userInputs.sunday.sunday_break_to || "",
        ],
      ];

      //delete from timings & holidays
      await database.query(
        `DELETE FROM timings WHERE business_id = ${exists[0].id}`
      );

      await database.query(
        `DELETE FROM holidays WHERE business_id = ${exists[0].id}`
      );

      var query =
        "INSERT INTO timings(business_id,day,work_from,work_to,break_from,break_to) VALUES ?";
      await database.query(query, [values]);

      await database.execute(
        `INSERT INTO holidays(business_id,holidays,holiday_work_from,holiday_work_to)
      VALUES(?,?,?,?)
      `,
        [
          exists[0].id,
          JSON.stringify(userInputs.holidays),
          userInputs.holidays_working.holiday_work_from,
          userInputs.holidays_working.holiday_work_to,
        ]
      );
      res.json({ message: "Successfully updated the business" });
    }
  } catch (e) {
    console.log(e);
    next(e);
  }
};

exports.GetServices = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business first!");
      return;
    }

    const sqlQuery = `SELECT services.id, services.name, services.prefix, services.service_time, services.description, 
    (select count(services_clients.id) from services_clients where services_clients.service_id  = services.id) as counts 
    FROM services WHERE business_id = ${exists[0].business_id}`;

    const [results] = await database.query(sqlQuery);
    res.json(results);
  } catch (e) {
    next(e);
  }
};

exports.PostServices = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT id,business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("Please add business first");
      return;
    }
    const userInputs = await validate.AddService.validateAsync(req.body);

    await database.execute(
      `INSERT INTO 
    services(business_id,name,prefix,service_time,description) 
    VALUES(?,?,?,?,?)`,
      [
        exists[0].business_id,
        userInputs.name || "",
        userInputs.prefix || "",
        userInputs.service_time || "",
        userInputs.description || "",
      ]
    );
    res.json({ message: "Successfully added the service" });
  } catch (e) {
    next(e);
  }
};

exports.DeleteServices = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT id,business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("Please add business first");
    }

    if (req.params.id) {
      await database.execute(
        `DELETE FROM services WHERE id = ? AND business_id = ?`,
        [req.params.id, exists[0].business_id]
      );
    }
    const [results] =
      await database.query(`SELECT id, name, prefix, service_time, description, 
    (select count(service_id) from services_clients where services_clients.service_id  = id) as counts 
    FROM services WHERE business_id = ${exists[0].business_id}`);
    res.json(results);
  } catch (e) {
    next(e);
  }
};

/*******************Custom Form Fields*******************/
exports.GetCustomForm = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business first!");
      return;
    }

    const [results] =
      await database.query(`SELECT id, name, type, is_required, given_values,def_values 
    FROM custom_form WHERE business_id = ${exists[0].business_id}`);

    res.json(results);
  } catch (e) {
    next(e);
  }
};

exports.PostCustomForm = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT id,business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("Please add business first");
      return;
    }
    const userInputs = await validate.AddCustomForm.validateAsync(req.body);

    const [addedCount] = await database.query(
      `SELECT count(id) as total FROM custom_form WHERE business_id = ${exists[0].business_id}`
    );
    if (addedCount[0].total >= 3) {
      throw createErrors.NotAcceptable(
        "Only three custom fields are allowed to add!"
      );
      return;
    }

    const insertData = await database.execute(
      `INSERT INTO 
      custom_form(business_id,name,type,is_required,given_values,def_values) 
    VALUES(?,?,?,?,?,?)`,
      [
        exists[0].business_id,
        userInputs.name || "",
        userInputs.type || "",
        userInputs.is_required || "",
        userInputs.given_values || null,
        userInputs.def_values || null,
      ]
    );
    if (insertData[0].insertId) {
      res.json({
        id: insertData[0].insertId,
        name: userInputs.name,
        type: userInputs.type,
        is_required: userInputs.is_required,
        given_values: userInputs.given_values,
        def_values: userInputs.def_values,
      });
    } else {
      throw createErrors.InternalServerError(
        "something went wrong, please try again later!"
      );
    }
    res.json({ message: "Successfully added the custom field" });
  } catch (e) {
    next(e);
  }
};

exports.DeleteCustomForm = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT id,business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("Please add business first");
    }

    if (req.params.id) {
      await database.execute(
        `DELETE FROM custom_form WHERE id = ? AND business_id = ?`,
        [req.params.id, exists[0].business_id]
      );
    }
    const [results] =
      await database.query(`SELECT id, name, type, is_required, given_values,def_values 
  FROM custom_form WHERE business_id = ${exists[0].business_id}`);

    res.json(results);
  } catch (e) {
    next(e);
  }
};

exports.GetStaff = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("No staffs found yet!");
      return;
    }

    const [results] =
      await database.query(`SELECT clients.id, clients.name, clients.email, clients.phone, clients.role, clients.availability, clients.adate, clients.activated FROM business_clients 
      JOIN clients ON clients.id = business_clients.client_id WHERE business_id=${exists[0].business_id}`);

    res.json(results);
  } catch (e) {
    next(e);
  }
};

exports.GetStaffDetails = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("No staffs found yet!");
    }

    const id = parseInt(req.params.id);
    if (!id) {
      throw createErrors.NotFound("No staffs found yet!");
    }

    const [results] = await database.query(
      `SELECT clients.id,clients.name,clients.phone,clients.email,clients.role,clients_break_time.break_time
       FROM clients LEFT JOIN clients_break_time ON clients_break_time.client_id = clients.id  WHERE clients.id=${id}`
    );

    //get the services details
    const serviceQ = `SELECT services.id, services.name FROM services_clients 
    JOIN services ON services.id = services_clients.service_id 
    WHERE services_clients.client_id = ${id}`;
    const [services] = await database.query(serviceQ);

    results[0].services = services;

    res.json(results[0]);
  } catch (e) {
    next(e);
  }
};

exports.PostStaff = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business first!");
      return;
    }

    const userInputs = await validate.AddStaff.validateAsync(req.body);
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

    //get the date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + "-" + mm + "-" + yyyy;

    const passwordHash = await bcrypt.hash(userInputs.password, 10);
    const insertStaff = await database.execute(
      `INSERT INTO 
      clients(name,email,phone,username,password,verified, adate, role) 
    VALUES(?,?,?,?,?,?,?,?)`,
      [
        userInputs.name || "",
        userInputs.email || "",
        userInputs.phone || "",
        userInputs.username || "",
        passwordHash,
        1,
        today,
        userInputs.role || 2,
      ]
    );

    if (insertStaff[0].insertId) {
      //add the clients to business
      await database.execute(
        `INSERT INTO business_clients(business_id,client_id) VALUES(?,?)`,
        [exists[0].business_id, insertStaff[0].insertId]
      );

      //add the break time
      await database.execute(
        `INSERT INTO clients_break_time(client_id,break_time) VALUES(?,?)`,
        [insertStaff[0].insertId, userInputs.break_time]
      );

      //add the services to the database
      if (userInputs.services) {
        const input_services = userInputs.services.split(",");
        var values = [];
        input_services.map((service) =>
          values.push([parseInt(service), insertStaff[0].insertId])
        );
        var query =
          "INSERT INTO services_clients(service_id,client_id) VALUES ?";
        await database.query(query, [values]);
      }
      res.json({ message: "Successfully added the staff" });
    }
  } catch (e) {
    next(e);
  }
};

exports.UpdateStaff = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business first!");
      return;
    }
    if (req.body.id) {
      await database.execute(`UPDATE clients SET activated=? WHERE id = ?`, [
        req.body.checked ? 1 : 0,
        req.body.id,
      ]);

      res.json({ message: "Successfully updated the staff" });
    }
  } catch (e) {
    next(e);
  }
};

exports.EditStaff = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const [dataFound] = await database.execute(
      "SELECT * FROM clients WHERE id = ?",
      [id]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );
    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business first!");
    }

    const userInputs = await validate.EditStaff.validateAsync(req.body);

    const updateStaff = await database.execute(
      `UPDATE clients SET name= ?, email=?, phone=?, role=? 
      WHERE id = ?`,
      [
        userInputs.name || dataFound[0].name || "",
        userInputs.email || dataFound[0].email || "",
        userInputs.phone || dataFound[0].phone || "",
        userInputs.role || 2,
        dataFound[0].id,
      ]
    );
    // res.json(updateStaff);
    // return;
    if (updateStaff[0].affectedRows) {
      if (userInputs.break_time) {
        //add the break time
        await database.query(
          `DELETE FROM clients_break_time WHERE client_id = ${dataFound[0].id}`
        );
        await database.execute(
          `INSERT INTO clients_break_time(client_id,break_time) VALUES(?,?)`,
          [dataFound[0].id, userInputs.break_time || ""]
        );
      }

      //add the services to the database
      if (userInputs.services) {
        await database.query(
          `DELETE FROM services_clients WHERE client_id = ${dataFound[0].id}`
        );
        const input_services = userInputs.services.split(",");
        var values = [];
        input_services.map((service) =>
          values.push([parseInt(service), dataFound[0].id])
        );
        var query =
          "INSERT INTO services_clients(service_id,client_id) VALUES ?";
        await database.query(query, [values]);
      }
    }
    res.json({ message: "Successfully updated the staff" });
  } catch (e) {
    next(e);
  }
};

exports.deleteStaff = async (req, res, next) => {
  try {
    await database.query(
      `DELETE FROM clients_break_time WHERE client_id = ${req.params.id};`
    );
    await database.query(
      `DELETE FROM services_clients WHERE client_id = ${req.params.id}`
    );
    const data = await database.query(`DELETE FROM clients WHERE id = ${req.params.id};`);
    res.status(200).send({ message: "Staff deleted", data: data })
  } catch (error) {
    next(error)
    res.status(200).send({ message: "Unable to delete", error: error });
  }
};

/*************TOKENS*********/
exports.GetTokens = async (req, res, next) => {
  try {
    const today = getDate();
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated, role FROM clients WHERE token = ?",
      [token]
    );
    if (dataFound[0].role === 1) {
      //select the business id
      const [business] = await database.query(
        `SELECT business_id FROM business_clients WHERE client_id = ${dataFound[0].id} `
      );

      if (business.length > 0) {
        const sqlQuery = `SELECT tokens.*,services.name as service FROM tokens 
        JOIN services ON services.id = tokens.service_id WHERE 
        services.business_id = ${business[0].business_id} AND tokens.adate = '${today}'`;
        const [tokens] = await database.execute(sqlQuery);
        res.json(tokens);
        return null;
      }
    } else {
      const [tokens] = await database.execute(
        `SELECT tokens.*,services.name as service FROM tokens JOIN services ON services.id = tokens.service_id WHERE client_id = ? AND adate = ?`,
        [dataFound[0].id, today]
      );
      res.json(tokens);
    }
    res.json([]);
  } catch (e) {
    next(e);
  }
};

exports.UpdateTokens = async (req, res, next) => {
  try {
    const { id, noshow, status } = req.body;
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );
    const [tokens] = await database.execute(
      `SELECT tokens.* FROM tokens WHERE id = ? AND client_id= ?`,
      [id, dataFound[0].id]
    );

    if (!tokens) {
      throw createErrors.NotFound("Token data not found!");
    }
    if (noshow) {
      await database.query(`UPDATE tokens SET noshow = 1 WHERE id=${id}`);
    }
    if (status) {
      await database.query(`UPDATE tokens SET status = 1 WHERE id=${id}`);
    }
    const [tokens2] = await database.execute(
      `SELECT tokens.*,services.name as service FROM tokens JOIN services ON services.id = tokens.service_id WHERE client_id = ? AND end_time >= ? AND noshow = ?`,
      [dataFound[0].id, new Date().getTime(), 0]
    );
    res.json(tokens2);
  } catch (e) {
    next(e);
  }
};

exports.UpdateToken = async (req, res, next) => {
  try {
    const today = getDate();
    const { id, progress } = req.body;
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );
    const [tokens] = await database.execute(
      `SELECT tokens.* FROM tokens WHERE id = ? AND client_id= ?`,
      [id, dataFound[0].id]
    );

    if (!tokens) {
      throw createErrors.NotFound("Token data not found!");
    }
    if (progress) {
      await database.query(
        `UPDATE tokens SET progress = '${progress}' WHERE id=${id}`
      );
    }

    const [tokens2] = await database.execute(
      `SELECT tokens.*,services.name as service FROM tokens JOIN services ON services.id = tokens.service_id WHERE client_id = ? AND adate = ?`,
      [dataFound[0].id, today]
    );
    res.json(tokens2);
  } catch (e) {
    next(e);
  }
};

exports.GetQRCodes = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, activated FROM clients WHERE token = ?",
      [token]
    );

    const [exists] = await database.execute(
      `SELECT business_id FROM business_clients WHERE client_id = ?`,
      [dataFound[0].id]
    );

    if (exists.length === 0) {
      throw createErrors.NotFound("Please add your business!");
    }

    //fetch the data from tables
    const [client] = await database.query(
      `SELECT business.id, business.name as bname,business_qrcode.qrcode FROM 
      business LEFT JOIN business_qrcode ON 
      business_qrcode.business_id = business.id 
      WHERE business.id = ${exists[0].business_id}`
    );
    res.json(client[0]);
  } catch (e) {
    next(e);
  }
};

//save files general funstion
const saveFiles = (fileName, table, field, id) => {
  const filePath = Date.now() + fileName.name;
  const uploadPath = path.join(process.cwd(), "/assets/images/", filePath);
  fileName.mv(uploadPath, (error) => {
    if (error) return null;
    const imagePath = URL + filePath;
    if (imagePath) {
      //save the image seperately
      database.execute(`UPDATE ${table} SET ${field}=? WHERE id = ?`, [
        imagePath || "",
        id,
      ]);
    }
  });
};

async function funGetCityName(lat, lng) {
  try {
    const geocodingClient = new Client({});
    let params = {
      latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
      key: "AIzaSyDcOuFij8ydq4vGwIFEGE0P9qwad7OPDng",
    };
    const response = await geocodingClient.reverseGeocode({ params: params });
    if (response) {
      const data = {
        status: true,
        address: getCityState(response.data.results[0].address_components),
      };
      return data;
    }
    return { status: false, error: "Something wrong" };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

function getCityState(address) {
  var data = { city: "", state: "" };
  address.map((add) => {
    if (add.types[0] === "administrative_area_level_1") {
      data.state = add.long_name;
    }
    if (add.types[0] === "administrative_area_level_2") {
      data.city = add.long_name;
    }
  });
  return data;
}

const generateQR = async (text) => {
  try {
    const code = await QRCode.toDataURL(text);
    return code;
  } catch (err) {
    return false;
  }
};

function getDate() {
  let date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  return day + "-" + month + "-" + year;
}
