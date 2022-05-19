const database = require("../../db");
const createErrors = require("http-errors");
const validate = require("../../helpers/joi.admin");
const path = require("path");
const URL = "http://localhost:5500/";
// const URL = "https://api.wism.in/";
const bcrypt = require("bcrypt");
const { Client } = require("@googlemaps/google-maps-services-js");
const QRCode = require("qrcode");

exports.Dashboard = (req, res, next) => {
  res.json("welcome to dashboard");
};

exports.getRoles = async (req, res, next) => {
  try {
    const [roles] = await database.query(
      "SELECT id, name FROM admin_roles ORDER BY id DESC"
    );
    res.json(roles);
  } catch (e) {
    next(e);
  }
};

exports.getEmployees = async (req, res, next) => {
  try {
    const [staffs] = await database.query(
      "SELECT admin.id, admin.name, admin.email, admin.phone,admin.activated,admin.image,admin.role, admin.adate FROM admin ORDER BY admin.id DESC"
    );
    res.json(staffs);
  } catch (e) {
    next(e);
  }
};

exports.postEmployee = async (req, res, next) => {
  try {
    const userInputs = await validate.AddStaff.validateAsync(req.body);
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

    //get the date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, "0");
    var mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    var yyyy = today.getFullYear();

    today = dd + "-" + mm + "-" + yyyy;

    const passwordHash = await bcrypt.hash(userInputs.password, 10);
    await database.execute(
      `INSERT INTO 
      admin(name,email,phone,username,password,activated, adate, role) 
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
    res.json({ message: "Successfully added the employee" });
  } catch (e) {
    next(e);
  }
};

// the editing tge employee
module.exports.updateEmployee = async (req, res, next) => {
  const { name, email, phone, activated, role } = req.body;
  try {
    const user = await database.query(
      `UPDATE admin SET name = '${name}', email = '${email}', phone = '${phone}', activated='${activated}', role='${role}' 
      WHERE id = ${req.params.id};`
    );

    res.status(200).send({ message: "Employee updated succesfully", data: user });
  } catch (error) {
    next(error)
    res.status(400).send({ message: "unable update employee", error: error });
  }
}

// the deleting the employee
module.exports.deleteEmployee = async (req, res, next) => {

  try {
    const user = await database.query(`DELETE FROM admin WHERE id = ${req.params.id};`);
    res.status(200).send({ message: "Employee deleted", data: user })
  } catch (error) {
    next(error)
    res.status(200).send({ message: "Unable delete", error: error });
  }
}

exports.getClientsRoles = async (req, res, next) => {
  try {
    const [roles] = await database.query(
      "SELECT id, name FROM clients_roles ORDER BY id DESC"
    );
    res.json(roles);
  } catch (e) {
    next(e);
  }
};
exports.getCategories = async (req, res, next) => {
  try {
    const [categories] = await database.query(
      "SELECT id, name FROM categories ORDER BY id DESC"
    );
    res.json(categories);
  } catch (e) {
    next(e);
  }
};


exports.getSubCategories = async (req, res, next) => {
  try {
    const [subCategories] = await database.query(
      "SELECT categories.id as category_id, categories.name as category, subcategories.id, subcategories.name FROM subcategories JOIN categories ON categories.id = subcategories.category_id ORDER BY categories.id ASC"
    );
    var category = [];
    var subCat = {};
    subCategories.map((sub) => {
      if (!category.includes(sub["category"])) {
        category.push(sub["category"]);
      }
    });
    var temp = [];
    var previous;
    category.map((sub) => {
      subCategories.map((sc) => {
        if (sub === sc.category) {
          if (!previous) {
            previous = sub;
          } else if (previous !== sub) {
            subCat[previous] = temp;
            temp = [];
            previous = sub;
          }
          temp.push(sc.name);
        }
      });
    });
    subCat[previous] = temp;

    res.json(subCategories);
  } catch (e) {
    next(e);
  }
};

exports.getSubCategory = async (req, res, next) => {
  try {
    const categoryID = parseInt(req.params.id);
    if (categoryID) {
      const [subCategories] = await database.query(
        `SELECT subcategories.id, subcategories.name FROM subcategories WHERE category_id= ${categoryID} ORDER BY subcategories.id ASC`
      );
      res.json(subCategories);
    }
  } catch (e) {
    next(e);
  }
};

exports.AddCategory = async (req, res, next) => {
  try {
    const category = await validate.AddCategory.validateAsync(req.body);
    const insertData = await database.execute(
      `INSERT INTO categories(name) VALUES(?)`,
      [category.name]
    );
    if (insertData[0].insertId) {
      res.json({
        id: insertData[0].insertId,
        name: category.name,
      });
    } else {
      throw createErrors.InternalServerError(
        "something went wrong, please try again later!"
      );
    }
  } catch (e) {
    next(e);
  }
};
exports.updateCategory = async (req, res, next) => {
  const { category } = req.body;
  try {
    const data = await database.query(
      `UPDATE categories SET name = '${category}'
      WHERE id = ${req.params.id};`
    );
    res.status(200).send({ message: "Category updated succesfully", data: data });
  } catch (error) {
    next(error)
    res.status(400).send({ message: "unable to update category", error: error });
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const data = await database.query(`DELETE FROM categories WHERE id = ${req.params.id};`);
    res.status(200).send({ message: "Category deleted", data: data })
  } catch (error) {
    next(error)
    res.status(200).send({ message: "Unable to delete", error: error });
  }
};


exports.AddSubCategory = async (req, res, next) => {
  try {
    const subcategory = await validate.AddSubCategory.validateAsync(req.body);
    const insertData = await database.execute(
      `INSERT INTO subcategories(category_id,name) VALUES(?,?)`,
      [subcategory.category_id, subcategory.name]
    );
    if (insertData[0].insertId) {
      res.json({
        id: insertData[0].insertId,
        category_id: subcategory.category_id,
        name: subcategory.name,
      });
    } else {
      throw createErrors.InternalServerError(
        "something went wrong, please try again later!"
      );
    }
  } catch (e) {
    next(e);
  }
};
exports.updateSubCategory = async (req, res, next) => {
  const { subcategory, category_id } = req.body;
  try {
    const data = await database.query(
      `UPDATE subcategories SET name = '${subcategory}', category_id = '${category_id}' WHERE id = ${req.params.id};`
    );
    res.status(200).send({ message: "Sub Category updated successfully", data: data });
  } catch (error) {
    res.status(400).send({ message: "unable to update sub category", error: error });
    next(error)
  }
};

exports.deleteSubCategory = async (req, res, next) => {
  try {
    const data = await database.query(`DELETE FROM subcategories WHERE id = ${req.params.id};`);
    res.status(200).send({ message: "Sub-Category deleted", data: data })
  } catch (error) {
    next(error)
    res.status(200).send({ message: "Unable to delete", error: error });
  }
};
/**************Profile********************/
exports.GetProfile = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const [dataFound] = await database.execute(
      "SELECT id, name, phone, email, image FROM admin WHERE token = ?",
      [token]
    );
    res.json(dataFound[0]);
  } catch (e) {
    next(e);
  }
};

exports.UpdateProfile = async (req, res, next) => {
  let fileName;
  let uploadPath;
  // return;
  try {
    const validateProfile = await validate.UpdateProfile.validateAsync(
      req.body
    );

    //select the user from the database
    const [rows] = await database.execute(
      `SELECT id,name,phone,email, password FROM admin WHERE id = ?`,
      [validateProfile.id]
    );
    //res.json(rows[0].id);
    if (rows.length === 0) {
      throw createErrors.NotFound("user not found!");
    }
    let newData = {};
    //first save the user data, then store the image
    if (validateProfile.name) {
      newData["name"] = validateProfile.name;
    } else {
      newData["name"] = rows[0].name;
    }

    if (validateProfile.email) {
      newData["email"] = validateProfile.email;
    } else {
      newData["email"] = rows[0].email;
    }

    if (validateProfile.password && validateProfile.newPassword) {
      //validate the password in the database
      const isPasswordMatch = await bcrypt.compare(
        validateProfile.password,
        rows[0].password
      );
      if (!isPasswordMatch) throw createErrors.Unauthorized("Wrong password");
      newData["password"] = await bcrypt.hash(validateProfile.newPassword, 10);
    } else {
      newData["password"] = rows[0].password;
    }

    await database.execute(
      `UPDATE admin SET name = ?, email = ?, password= ? WHERE id = ?`,
      [newData.name, newData.email, newData.password, rows[0].id]
    );

    if (req.files) {
      fileName = req.files.image;
      const filePath = Date.now() + fileName.name;
      uploadPath = path.join(process.cwd(), "/assets/images/", filePath);
      fileName.mv(uploadPath, (error) => {
        if (error) throw createErrors.InternalServerError(error);
        const imagePath = "http://localhost:5500/" + filePath;
        if (imagePath) {
          //save the image seperately
          database.execute(`UPDATE admin SET image=? WHERE id = ?`, [
            imagePath,
            rows[0].id,
          ]);
        }
      });
    }

    const [newRows] = await database.execute(
      `SELECT id,name,phone,email, image FROM admin WHERE id = ?`,
      [validateProfile.id]
    );
    //res.json(rows[0].id);
    res.json(newRows[0]);
  } catch (e) {
    next(e);
  }
};

/**************Services********************/
exports.GetServices = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [results] =
      await database.query(`SELECT id, name, prefix, service_time, description, 
    (select count(service_id) from services_clients where services_clients.service_id  = id) as counts 
    FROM services WHERE business_id = ${id}`);
    res.json(results);
  } catch (e) {
    next(e);
  }
};

exports.PostServices = async (req, res, next) => {
  try {
    const userInputs = await validate.AddService.validateAsync(req.body);

    await database.execute(
      `INSERT INTO 
    services(business_id,name,prefix,service_time,description) 
    VALUES(?,?,?,?,?)`,
      [
        userInputs.business_id,
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

/**************Business Staffs********************/
exports.PostBStaff = async (req, res, next) => {
  try {
    const userInputs = await validate.AddBStaffs.validateAsync(req.body);
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
        [userInputs.business_id, insertStaff[0].insertId]
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

/**************Businesses********************/
exports.GetBusiness = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    //fetch the data from tables
    const [client] = await database.query(
      `SELECT business.id, business.name as bname,business.id as bid, business.telephone, business.website,business.info,
      business.ad1,business.ad2,business.address1,business.address2,business.street,
      business.city,business.state,business.postalcode,business.lat,business.lng, business.subcategories,
      business.photo as image,business.status,business.open_all_time, categories.name as category, 
      holidays.holidays,holidays.holiday_work_from,holidays.holiday_work_to FROM 
      business LEFT JOIN categories ON 
      categories.id = business.category 
      LEFT JOIN holidays ON holidays.business_id = business.id
      WHERE business.id = ${id}`
    );

    if (client[0].subcategories) {
      const subCategories = JSON.parse(client[0].subcategories).split(",");
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
    WHERE business_id = ${id}`);
    client[0].timings = timings;

    //get services
    const [services] =
      await database.query(`SELECT id, name, prefix, service_time, description, 
    (select count(service_id) from services_clients where services_clients.service_id  = id) as counts 
    FROM services WHERE business_id = ${id}`);
    client[0].services = services;

    const [users] =
      await database.query(`SELECT clients.id, clients.name, clients.email, clients.phone, clients.role, clients.availability, clients.adate, clients.activated FROM business_clients 
      JOIN clients ON clients.id = business_clients.client_id WHERE business_id=${id}`);
    client[0].users = users;
    res.json(client[0]);
  } catch (e) {
    next(e);
  }
};

exports.GetBusinesses = async (req, res, next) => {
  try {
    //fetch the data from tables
    const [businesses] = await database.query(
      `SELECT business.id,business.name,business.telephone,business.photo as image,business.status, 
      categories.name as category FROM business LEFT JOIN categories ON categories.id = business.category ORDER BY business.id DESC`
    );

    res.json(businesses);
  } catch (e) {
    next(e);
  }
};
exports.PutBusiness = async (req, res, next) => {
  try {
    if (req.body.id) {
      await database.execute(`UPDATE business SET status=? WHERE id = ?`, [
        req.body.checked ? 1 : 0,
        req.body.id,
      ]);
    }
    res.json({ message: "Successfully updated the business" });
  } catch (e) {
    next(e);
  }
};

exports.PostBusiness = async (req, res, next) => {
  try {
    const userInputs = await validate.AddBusiness.validateAsync(req.body);

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

    const passwordHash = await bcrypt.hash(userInputs.phone, 10);
    const insertData = await database.execute(
      `INSERT INTO clients (name, phone, username, password, role, activated, verified, adate) VALUES(?,?,?,?,?,?,?,?)`,
      [
        userInputs.name,
        userInputs.phone,
        userInputs.phone,
        passwordHash,
        1,
        1,
        1,
        today,
      ]
    );

    //if successfully inserted
    if (insertData[0].insertId) {
      //parse the json
      // if (userInputs.monday) {
      //   userInputs.monday = JSON.parse(userInputs.monday);
      // }
      // if (userInputs.tuesday) {
      //   userInputs.tuesday = JSON.parse(userInputs.tuesday);
      // }
      // if (userInputs.wednessday) {
      //   userInputs.wednessday = JSON.parse(userInputs.wednessday);
      // }
      // if (userInputs.thursday) {
      //   userInputs.thursday = JSON.parse(userInputs.thursday);
      // }
      // if (userInputs.friday) {
      //   userInputs.friday = JSON.parse(userInputs.friday);
      // }
      // if (userInputs.saturday) {
      //   userInputs.saturday = JSON.parse(userInputs.saturday);
      // }
      // if (userInputs.sunday) {
      //   userInputs.sunday = JSON.parse(userInputs.sunday);
      // }
      // if (userInputs.holidays_working) {
      //   userInputs.holidays_working = JSON.parse(userInputs.holidays_working);
      // }

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

      //insert the business details
      const insertBusiness = await database.execute(
        `INSERT INTO business 
    (name, telephone, website, info,address1, address2, street, 
      city,districts, state,postalcode,lat,lng,category,subcategories,open_all_time, status) 
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
          1,
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
          [insertBusiness[0].insertId, insertData[0].insertId]
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

        //qrcode
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
    } else {
      throw createErrors.InternalServerError(
        "Something went wrong, please try again later"
      );
    }
  } catch (e) {
    next(e);
  }
};

exports.EditBusiness = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) {
      throw createErrors.NotFound("No business found!");
    }

    //get the business details
    const [exists] = await database.execute(
      `SELECT * FROM business WHERE id = ?`,
      [id]
    );

    if (exists.length === 0) {
      throw createErrors.NotAcceptable("This business not added any business");
    }

    const userInputs = await validate.EditBusiness.validateAsync(req.body);

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
        userInputs.bname || exists[0].name || "",
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
        userInputs.category || exists[0].category || "",
        userInputs.subcategories
          ? JSON.stringify(userInputs.subcategories)
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
