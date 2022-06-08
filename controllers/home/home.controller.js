const createErrors = require("http-errors");
const database = require("../../db");
const validate = require("../../helpers/joi.home");
const { Client } = require("@googlemaps/google-maps-services-js");

exports.GetHome = async (req, res, next) => {
  res.json({ message: "Welcome to WiSM" });
};

exports.Categories = async (req, res, next) => {
  try {
    const [categories] = await database.query(
      "SELECT id, name, image FROM categories ORDER BY id ASC"
    );
    res.json(categories);
  } catch (e) {
    next(e);
  }
};
exports.homeCategories = async (req, res, next) => {
  try {
    const [subCategories] = await database.query(
      `SELECT categories.id as category_id, categories.name as category, 
      subcategories.id, subcategories.name FROM subcategories 
      JOIN categories ON categories.id = subcategories.category_id 
      ORDER BY categories.priority ASC`
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
          //temp.push(sc.name);
          temp.push({ id: sc.id, name: sc.name });
        }
      });
    });
    subCat[previous] = temp;

    res.json([subCat]);
  } catch (e) {
    next(e);
  }
};

exports.homeCategory = async (req, res, next) => {
  try {
    const suCategoryID = parseInt(req.params.id);
    const [suCat] = await database.query(
      `SELECT categories.name, subcategories.category_id FROM subcategories JOIN 
      categories ON categories.id = subcategories.category_id WHERE subcategories.id= ${suCategoryID}`
    );
    if (suCat.length === 0) {
      throw createErrors.Conflict(`no category found!`);
    }
    const [subCategory] = await database.query(
      `SELECT subcategories.id, subcategories.name FROM subcategories JOIN 
      categories ON categories.id = subcategories.category_id 
      WHERE subcategories.category_id= ${suCat[0].category_id}
      ORDER BY categories.id ASC`
    );
    res.json({ category: suCat[0].name, sucategories: subCategory });
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

exports.getBusinesses = async (req, res, next) => {
  try {
    const [businesses] = await database.query(
      `SELECT business.id,business.name,business.telephone,business.photo as image,
      business.status, business.info, business.city, business.state,
      categories.name as category FROM business LEFT JOIN categories ON categories.id = business.category WHERE business.status = 1`
    );

    res.json(businesses);
  } catch (e) {
    next(e);
  }
};

exports.getBusiness = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    //fetch the data from tables
    const [client] = await database.query(
      `SELECT business.id, business.name as bname,business.id as bid, business.telephone, business.website,business.info,
      business.ad1,business.ad2,business.address1,business.address2,business.street,
      business.city,business.state,business.postalcode,business.lat,business.lng, business.subcategories,
      business.photo as image,business.status,business.open_all_time, categories.name as category, 
      holidays.holidays,holidays.holiday_work_from,holidays.holiday_work_to FROM 
      business JOIN categories ON 
      categories.id = business.category 
      LEFT JOIN holidays ON holidays.business_id = business.id
      WHERE business.id = ${id}`
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
    //get custom forms fields
    const [forms] = await database.query(
      `SELECT id, name, type,is_required, given_values, def_values FROM custom_form WHERE business_id = ${id}`
    );
    client[0].forms = forms;

    res.json(client[0]);
  } catch (e) {
    console.log(e)
    next(e);
  }
};

exports.getTimeSlot = async (req, res, next) => {
  try {
    const id = parseInt(req.query.id);
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const mode = req.query.mode;
    //get today
    const day = getDay();
    const time = getTime();
    //const todayDate = getDate();
    //get the service
    const [service] = await database.query(
      `SELECT business_id,name,service_time FROM services WHERE id = ${id}`
    );
    if (service.length === 0) {
      throw createErrors.Conflict(`no service available`);
    }

    //check if the business open for all time
    const [business] = await database.query(
      `SELECT id,open_all_time,lat,lng FROM business WHERE id=${service[0].business_id}`
    );

    if (business.length === 0) {
      throw createErrors.Conflict(`no business available`);
    }

    //calculate travelling time
    //based on the mode of transfer from source to business + 15mins buffer time
    var travelTime = 35;
    if (lat && lng) {
      const distance = await calculateDistance(
        { lat: lat, lng: lng },
        { lat: business[0].lat, lng: business[0].lng },
        mode ? mode : "DRIVING"
      );

      if (distance) {
        if (distance?.distance[0]?.distance?.value < 60) {
          const newTravelTime = 15 + 1;
          travelTime = newTravelTime;
        } else {
          const newTravelTime =
            15 + Math.round(distance?.distance[0]?.duration?.value / 60);
          travelTime = newTravelTime;
        }
      }
    }
    const tQuery = `SELECT day,work_from,work_to,break_from, break_to 
    FROM timings WHERE business_id = ${service[0].business_id} AND day='${day}'`;
    const [todayTiming] = await database.query(tQuery);

    if (!business[0].open_all_time) {
      if (todayTiming.length === 0) {
        throw createErrors.Conflict(`Business Closed Today`);
      }
      if (!todayTiming[0].work_from) {
        throw createErrors.Conflict(`Business Closed Today`);
      }

      //check open time and close time
      if (time < todayTiming[0].work_from) {
        throw createErrors.Conflict(`Business Not Opened Yet`);
      }
      if (time > todayTiming[0].work_to) {
        throw createErrors.Conflict(`Business Closed Today`);
      }
    }
    //get the staff
    const [clients] =
      await database.query(`SELECT clients_break_time.client_id,clients_break_time.break_time,
      tokens.start_time,tokens.end_time,tokens.start_t,tokens.end_t FROM services_clients JOIN clients_break_time  ON clients_break_time.client_id = services_clients.client_id 
     LEFT JOIN tokens ON tokens.client_id = services_clients.client_id WHERE services_clients.service_id = ${id}`);

    const next_time_slots = [];

    if (clients) {
      var time_slot_beg = addMinutes(time, 5);
      if (
        !business[0].open_all_time &&
        todayTiming[0].break_to &&
        time < todayTiming[0].break_to
      ) {
        time_slot_beg = todayTiming[0].break_to;
      }
      // console.log(time_slot_beg);
      for (let i = 0; i <= 100; i++) {
        //var time_slot_beg = 10
        var start;
        if (!start) {
          var start = time_slot_beg;
        }
        const time_slot_next = addMinutes(start, travelTime);
        clients.map((client) => {
          //first check staff is not serving any token
          if (!client.start_time && !client.end_time) {
            //now check staff is not in break time
            const client_break_time = JSON.parse(client.break_time).split(",");
            //if client don't have the break time
            if (client_break_time.length === 0) {
              if (next_time_slots.length < 3) {
                //check same timings is there
                let already_added = next_time_slots.find(
                  (nt) => nt.time === time_slot_next
                );
                if (!already_added) {
                  next_time_slots.push({
                    client: client.client_id,
                    time: time_slot_next,
                  });
                }
              }
            } else {
              client_break_time.map((cbt) => {
                //split the time further
                if (cbt.length > 0) {
                  const cbt_start_end = cbt.split("-");
                  if (cbt_start_end[0] && cbt_start_end[1]) {
                    if (time_slot_next > cbt_start_end[1]) {
                      if (next_time_slots.length < 3) {
                        //check same timings is there
                        let already_added = next_time_slots.find(
                          (nt) => nt.time === time_slot_next
                        );
                        if (!already_added) {
                          next_time_slots.push({
                            client: client.client_id,
                            time: time_slot_next,
                          });
                        }
                      }
                    }
                  }
                }
              });
            }
          } else {
            if (time_slot_next > client.end_t) {
              if (next_time_slots.length < 3) {
                //check same timings is there
                let already_added = next_time_slots.find(
                  (nt) => nt.time === time_slot_next
                );
                if (!already_added) {
                  next_time_slots.push({
                    client: client.client_id,
                    time: time_slot_next,
                  });
                }
              }
            }
          }
        });
        start = time_slot_next;
        if (next_time_slots.length >= 4) {
          break;
        }
      }
    }
    res.json(next_time_slots);
  } catch (e) {
    next(e);
  }
};

exports.postToken = async (req, res, next) => {
  try {
    const userInputs = await validate.AddToken.validateAsync(req.body);
    //get the service
    const [service] = await database.query(
      `SELECT business_id,name,service_time FROM services WHERE id = ${userInputs.service}`
    );
    if (service.length === 0) {
      throw createErrors.Conflict(`no service available`);
    }

    const today = getDate();
    const convert_start_time = today + " " + userInputs.time;
    const convert_end_time =
      today + " " + addMinutes(userInputs.time, service[0].service_time);
    const start_time = timeToStamp(convert_start_time);
    const end_time = timeToStamp(convert_end_time);
    await database.execute(
      `
    INSERT INTO tokens(business_id,service_id,client_id,transfer_mode,name,phone,options,start_time,end_time,start_t,end_t,adate)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    `,
      [
        userInputs.business_id || null,
        userInputs.service || null,
        userInputs.client_id || null,
        userInputs.mode || null,
        userInputs.name || null,
        userInputs.phone || null,
        JSON.stringify(userInputs.options) || null,
        start_time || null,
        end_time || null,
        userInputs.time || null,
        addMinutes(userInputs.time, service[0].service_time) || null,
        today || null,
      ]
    );
    res.json({
      message:
        "Your token confirmed, you will receive the details soon to your mobile number",
    });
  } catch (e) {
    next(e);
  }
};

/****************SEARCH***************/
exports.getSearch = async (req, res, next) => {
  try {
    const cat = req.query.cat;
    const subCat = req.query.subcat;
    const city = req.query.city;
    const business = req.query.business;
    const dist = parseInt(req.query.dist) ? req.query.dist * 1000 : 5 * 1000;
    const lat = req.query.lat;
    const lng = req.query.lng;
    var where = `status = 1`;
    if (cat && cat != null) {
      where += ` AND category = ${cat}`;
    }
    if (!lat && !lng) {
      if (city && city != null) {
        where += ` AND districts = '${city}'`;
      }
    }
    if (business && business != null) {
      where += ` AND business.name LIKE '%${business}%'`;
    }
    const day = getDay();
    var q = `SELECT business.id,business.name,business.telephone,
    business.photo as image,business.status, business.subcategories,business.address1,
    business.address2,business.street, business.info, business.city, business.state,
    business.open_all_time, business.lat,business.lng,categories.name as category,
    (SELECT work_from FROM timings WHERE business_id = business.id AND day = '${day}') as work_from,
    (SELECT work_to FROM timings WHERE business_id = business.id AND day = '${day}') as work_to,
    (SELECT break_from FROM timings WHERE business_id = business.id AND day = '${day}') as break_from,
    (SELECT break_to FROM timings WHERE business_id = business.id AND day = '${day}') as break_to
    FROM business LEFT JOIN categories ON 
    categories.id = business.category WHERE ${where}`;

    if (subCat && subCat != null) {
      //where += ` AND subcategories LIKE '%${subCat}%'`;
      var q = `SELECT business.id,business.name,business.telephone,
    business.photo as image,business.status, business.subcategories,business.address1,
    business.address2,business.street, business.info, business.city, business.state,
    business.open_all_time,business.lat,business.lng,categories.name as category,
    (SELECT work_from FROM timings WHERE business_id = business.id AND day = '${day}') as work_from,
    (SELECT work_to FROM timings WHERE business_id = business.id AND day = '${day}') as work_to,
    (SELECT break_from FROM timings WHERE business_id = business.id AND day = '${day}') as break_from,
    (SELECT break_to FROM timings WHERE business_id = business.id AND day = '${day}') as break_to,
    business_subcat.subcat_id 
    FROM business LEFT JOIN categories ON 
    categories.id = business.category 
    JOIN business_subcat ON business_subcat.business_id = business.id
    WHERE ${where} AND business_subcat.subcat_id = ${subCat}`;
    }

    const [businesses] = await database.query(q);
    var finalData = [];
    if (businesses.length > 0) {
      businesses[0].day = day;
      var i = 0;
      for (const b of businesses) {
        if (b.subcategories) {
          const subCategories = b.subcategories.split(",");
          const q = `SELECT id, name FROM subcategories WHERE id IN (${subCategories})`;
          const [subCatNames] = await database.query(q);
          businesses[i].subcats = subCatNames;
        }
        //get the distance from the source
        if (lat && lat != null && lng && lng != null) {
          const results = await calculateDistance(
            { lat: lat, lng: lng },
            { lat: b.lat, lng: b.lng }
          );
          
          businesses[i].distance = results;
        }
        i++;
      }

      //filter the results based on the distance
      for (let bus of businesses) {
        // console.log("inside the serach api", bus)
        // finalData.push(bus);
        if (bus.distance) {
          if (bus.distance.distance[0].distance.value < dist) {
            finalData.push(bus);
          }
        }
      }
    }

    res.json(finalData);
  } catch (e) {
    console.log(e)
    next(e);
  }
};

function getDate() {
  let date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();

  return day + "-" + month + "-" + year;
}
function getDay() {
  const d = new Date();
  const weekday = new Array(7);
  weekday[0] = "Sunday";
  weekday[1] = "Monday";
  weekday[2] = "Tuesday";
  weekday[3] = "Wednesday";
  weekday[4] = "Thursday";
  weekday[5] = "Friday";
  weekday[6] = "Saturday";

  let day = weekday[d.getDay()];
  return day;
}
function getTime() {
  const today = new Date();
  return today.getHours() + ":" + today.getMinutes();
}

function timeToStamp(time) {
  var dateString = time,
    dateTimeParts = dateString.split(" "),
    timeParts = dateTimeParts[1].split(":"),
    dateParts = dateTimeParts[0].split("-"),
    date;

  date = new Date(
    dateParts[2],
    parseInt(dateParts[1], 10) - 1,
    dateParts[0],
    timeParts[0],
    timeParts[1]
  );
  return date.getTime();
}

function addMinutes(time, minsToAdd) {
  function D(J) {
    return (J < 10 ? "0" : "") + J;
  }
  var piece = time.split(":");
  var mins = piece[0] * 60 + +piece[1] + +minsToAdd;

  return D(((mins % (24 * 60)) / 60) | 0) + ":" + D(mins % 60);
}

/********************CALCULATE DISTANCE******************/
async function calculateDistance(source, destination, mode = null) {
  console.log(source, destination)
  try {
    const geocodingClient = new Client({});
    let params = {
      origins: [source],
      destinations: [destination],
      mode: mode ? mode : "DRIVING",
      key: "AIzaSyDcOuFij8ydq4vGwIFEGE0P9qwad7OPDng",
    };
    const response = await geocodingClient.distancematrix({ params: params });
    console.log(response.data.rows[0].elements)
    if (response) {
      const data = {
        status: true,
        distance: response.data.rows[0].elements,
      };
      return data;
    }
    return { status: false, error: "Something wrong" };
  } catch (e) {
    return { status: false, error: e.message };
  }
}
