const parseReportAndStore = require('./parseReportAndStore').parseReportAndStore;
const util = require('./util');
const makeDb = util.makeDb;
const createTables = require('./createTables')

const settings = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
  }

const db = makeDb(settings);

createTables(db)

const urls_and_templates = [
  {"URL": 'https://getcraft.com', "Template": 'HomePage'},
  {"URL": 'https://crafters.getcraft.com', "Template": 'CrafterPage'},
  {"URL": 'https://getcraft.com/creator', "Template": 'CreatorPage'},
  {"URL": 'https://getcraft.com/vndrs/design-for-brand-identity', "Template":'ServicePage'},
  {"URL": 'https://getcraft.com/rahmat_work', "Template": 'ProfilePage'},
  {"URL": 'https://getcraft.com/search?searchKeyword=Designer', "Template":'SearchPage'},
  {"URL": 'https://academy.getcraft.com', "Template": 'AcademyPage'},
  {"URL": 'https://datastudio.google.com/gallery?category=community', "Template": 'GDS_Community_Gallary'},
  {"URL": 'https://support.google.com/datastudio/answer/7540410?hl=en', "Template": 'GDS_Help_Center'},
  {"URL": 'https://datastudio.google.com/open/0Bx4C5aFm3RdKQ0hrekVncUJmYTQ', "Template": 'This_Report'}
]

//select distinct fetch_time from raw_reports;
const start_date = '2020-03-24'
const end_date = '2020-04-15'

async function getReportsForDates(urls_and_templates, start_date, end_date){
  const dates = util.getDateRangeArray(start_date, end_date)
  console.log(dates)

  dates.forEach((date) =>{
    console.log("doing reporting for ", date)
    doReporting(urls_and_templates, date)
  })

}


// Take a list of urls and templates and do the whole reporting thing
// Generate report, then parse and store in the database
async function doReporting (urls_and_templates, date) {
  // Loop through all of the urls and templates
  for (let i = 0; i < urls_and_templates.length; i++) {
    // Get the URL and Template
    const url = urls_and_templates[i]['URL'];
    const template = urls_and_templates[i]['Template'];

    // Logging
    console.log("auditing for ", urls_and_templates[i], date);

    // Perform the audit (catch error if needed)
    try {
      let report = await getReportByTemplateDate(template, date)

      // Check for errors and proceed if all is well
      if (report['runtimeError'] != null) {
        console.error(report['runtimeError']['message']);
      }else{
        // Generate insert the report into the database tables
        console.log("storing ", template);
        console.log("report: ", report[0].id)
        report = JSON.parse(report[0].report);
        await parseReportAndStore(url, template, report);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

async function getReportByTemplateDate(template, date) {
  let query = `SELECT * from raw_reports
    WHERE DATE(fetch_time) = '${date}'
    AND template='${template}' limit 1`;

    console.log(query)

  return await db.query( query )
}

async function getReportByID(id) {
  let query = `SELECT * from raw_reports
    WHERE id = ${id}`;

    console.log(query)

  return await db.query( query )
}


getReportsForDates(urls_and_templates, start_date, end_date);