const mysql = require("mysql2");

const host = process.env.HOST;
const username = process.env.DBUSERNAME;
const password = process.env.DBPASSWORD;
const database = process.env.DATABASE;

const connectionPool = mysql.createPool({
  host: host,
  user: username,
  password: password,
  database: database,
  connectionLimit: 100,
  debug: false,
  waitForConnections: true,
  queueLimit: 0,
  // port: 25060, // for production
  port: 3306, // for developement
});

module.exports = connectionPool.promise();
