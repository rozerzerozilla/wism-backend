const { Client } = require("@googlemaps/google-maps-services-js");

exports.getLatLng = async (req, res, next) => {
  const address = req.query.address;
  const results = await funGetLatLng(address);
  res.json(results);
};

exports.getCityName = async (req, res, next) => {
  try {
    const lat = req.query.lat;
    const lng = req.query.lng;
    console.log('line 14', lat , lng)
    const results = await funGetCityName(lat, lng);
    
    res.status(200).json(results);
  } catch (error) {
    console.log(error);
    next(error)
  }
};
// the getting the details address of the particular map pin
function getCompleteAddress(obj) {
  const geocodingClient = new Client({});
  geocodingClient.elevation({
      params: {
        locations: [{ lat: obj.lat, lng: obj.lng }],
        key: "AIzaSyDcOuFij8ydq4vGwIFEGE0P9qwad7OPDng",
      },
      timeout: 1000, // milliseconds
    })
    .then((res) => {
      console.log(res.data);
    })
    .catch((e) => {
      console.log(e.response.data.error_message);
    });
}

async function funGetLatLng(address) {
  console.log(address);
  try {
    const geocodingClient = new Client({});
    let params = {
      address: parseInt(address),
      components: "country:IN",
      key: "AIzaSyDcOuFij8ydq4vGwIFEGE0P9qwad7OPDng",
      // key: "AIzaSyBPi8kETfM3J_MvBYyC8gEqvVeLZc6wCXg",
    };
    const response = await geocodingClient.geocode({ params: params });
    console.log(response.data.results[0]);
    if (response) {
      const data = {
        status: true,
        lat: response.data.results[0]?.geometry.location.lat,
        lng: response.data.results[0]?.geometry.location.lng,
        postal_localities: response.data.results[0]?.postcode_localities,
        address_components: response.data.results[0]?.address_components,
        details: response.data.results[0],
      };
      // getCompleteAddress(data)
      return data;
    }
    return { status: false, error: "Something wrong" };
  } catch (e) {
    return { status: false, error: e.message };
  }
}

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
        details: response.data.results[0],
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

exports.getDistance = async (req, res, next) => {
  const source = req.query.source;
  const destination = req.query.dest;
  const results = await calculateDistance(source, destination);
  res.json(results);
};

/********************CALCULATE DISTANCE******************/
async function calculateDistance(source, destination) {
  try {
    const geocodingClient = new Client({});
    let params = {
      origins: [source],
      destinations: [destination],
      key: "AIzaSyDcOuFij8ydq4vGwIFEGE0P9qwad7OPDng",
    };
    const response = await geocodingClient.distancematrix({ params: params });
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
