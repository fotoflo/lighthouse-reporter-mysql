// dependencies
const mysql = require('mysql');

const settings = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
  }


if(!settings.database){
  console.log("\nNo Database credentials in Envirnment, please edit .env and run source .env")
  process.exit();
}

console.log(`logging into database ${settings.database} at ${settings.host}\n`)

const client = mysql.createConnection(settings);  


function connect (callback) {
  client.connect(function(err) {
  if (err) {
    console.log(settings)
    console.error('error connecting: ' + err.stack);
    return;
  }

  console.log('connected to db as id ' + client.threadId);
  });

  console.log("creating tables")

  client.query(`CREATE TABLE IF NOT EXISTS
                  raw_reports(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (2048) NOT NULL,
                    template VARCHAR (255),
                    fetch_time timestamp,
                    report JSON NOT NULL
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  urls(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (2048) NOT NULL,
                    template VARCHAR (255),
                    start_date timestamp DEFAULT CURRENT_TIMESTAMP,
                    latest_date timestamp DEFAULT CURRENT_TIMESTAMP,
                    lifetime DECIMAL
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  gds_audits(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (2048) NOT NULL,
                    template VARCHAR(2048),
                    fetch_time timestamp,
                    page_size decimal,
                    first_contentful_paint decimal,
                    max_potential_fid decimal,
                    time_to_interactive decimal,
                    first_meaningful_paint decimal,
                    first_cpu_idle decimal
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  resource_chart(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    resource_url VARCHAR(2048),
                    resource_type VARCHAR(2048),
                    start_time decimal,
                    end_time decimal
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  savings_opportunities(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    audit_text VARCHAR(2048),
                    estimated_savings decimal
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  diagnostics(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    diagnostic_id VARCHAR(2048),
                    item_label VARCHAR(2048),
                    item_value DECIMAL
                  )
  `);


  client.query(`CREATE TABLE IF NOT EXISTS
                  scores(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    category VARCHAR(2048),
                    title VARCHAR(2048),
                    score INT
                  )
  `);

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
    console.error(err);
  }
}

module.exports = {
  connect,
  disconnect,
  query
};
