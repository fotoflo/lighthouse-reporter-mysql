// dependencies
const mysql = require('mysql');
const createTables = require('./createTables')
const {printDBsettings} = require('printdbsettings')


const settings = {
  'user'                  : process.env.DB_USER,
  'host'                  : process.env.DB_HOST,
  'database'              : process.env.DB_NAME,
  'password'              : process.env.DB_PASS,
  'socketPath'            : process.env.DB_SOCKET_PATH || "",
  'port'                  : process.env.DB_PORT,
  'waitForConnections'    : true,
  'connectionLimit'       : 10,
  'queueLimit'            : 1000
}

printDBsettings(settings)


if(!settings.database){
  console.log("\nNo Database credentials in Envirnment, please edit .env and run source .env")
  process.exit();
}

const client = mysql.createConnection(settings);  


function connect (callback) {
  client.connect(function(err) {
  if (err) {
    console.log(settings)
    console.error('error connecting to db: ' + err.stack);
    return;
  }

  console.log('connected to db as id ' + client.threadId);
  });

  console.log("creating tables")

  createTables(client)

  // Call the callback
  callback();
}

// Disconnect from the database
function disconnect () {
  client.end(err => {
    console.log('Disconnected from database');

    if (err) {
      console.log('There was an error during disconnection', err.stack);
    }
  });
}

async function query (query_text, query_params) {

  if(query_params && query_params.fetch_time){
    query_params.fetch_time = query_params.fetch_time.replace(/Z/, '');
    query_params.fetch_time = query_params.fetch_time.replace(/T/, ' ');
  }

  if(query_params && query_params.report && query_params.report.fetchTime){
    query_params.report.fetchTime = query_params.report.fetchTime.replace(/Z/, '');
    query_params.report.fetchTime = query_params.report.fetchTime.replace(/T/, ' ');
  }

  try {
    const result = await client.query(query_text, query_params);
    // console.log(`query ${query_text} returned ${result}`)
    return result;
  }catch (err) {
    console.log("********* CAUGHT ERROR *********")
    console.log("query_text", query_text)
    console.log("\nquery_params", query_params)
    console.error(err);
  }
}

module.exports = {
  connect,
  disconnect,
  query
};
