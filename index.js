// dependencies
const lighthouse = require('lighthouse');
const chrome_launcher = require('chrome-launcher');
const db = require('./database');
const fs = require('fs');
const path = require('path');
const neat_csv = require('neat-csv');
const dotenv = require('dotenv');


const parseReportAndStore = require('./parseReportAndStore').parseReportAndStore;

// Load environment variables
dotenv.config();

// Is this a recurring report or no?
let should_repeat = false;

// For how long should this URL automatically be reported on?
let auto_report_lifetime = 90; // Days

// How frequently should this report be rerun
let auto_report_interval = 30; // Days between reports

// Get the args
// If auto report
if (process.argv.length > 2) {
  should_repeat = process.argv[2] == 'auto';
}

// If interval is supplied
if (should_repeat) {
  if (process.argv.length > 3) {
    auto_report_interval = parseInt(process.argv[3]);
  }

  // If lifetime is supplied
  if (process.argv.length > 4) {
    auto_report_lifetime = parseInt(process.argv[4]);
  }
}

// Validate arguments
if (isNaN(auto_report_interval) || isNaN(auto_report_lifetime) ||
                auto_report_interval < 1 || auto_report_lifetime < 1) {
  console.log('$$$Sorry, please check your input.');
  return;
}

if (should_repeat) {
  console.log('$$$This report will run every ' + auto_report_interval + ' days for ' + auto_report_lifetime + ' days.');
}else{
  console.log('$$$This report will only run once.');
}

// Lighthouse options
const options = {
  chromeFlags: ['--headless', '--no-sandbox']
};

// A config, don't know what it does
const config = {
  extends: 'lighthouse:default'
};

// Perform the audit (returns the final report, if successful)
function performAudit (url, opts, config = null) {
  return chrome_launcher.launch({ chromeFlags: opts.chromeFlags }).then(chrome => {
    opts.port = chrome.port;

    return lighthouse(url, opts, config).then(results => {
      return chrome.kill().then(() => results.lhr).catch(err => console.error(err));
    }).catch(up => {
      console.log('Killing Chrome to prevent hanging.');
      chrome.kill(); // <-- Kill chrome anyway
      throw up; // <- ha ha
    });
  }).catch(err => {
    throw err; // <-- CHALLENGE ACCEPTED
  });
}

// Take a list of urls and templates and do the whole reporting thing
// Generate report, then parse and store in the database
async function doReporting (urls_and_templates) {
  // Loop through all of the urls and templates
  for (let i = 0; i < urls_and_templates.length; i++) {
    // Get the URL and Template
    const url = urls_and_templates[i]['URL'];
    const template = urls_and_templates[i]['Template'];

    // Logging
    console.log("auditing for ", urls_and_templates[i]);

    // Perform the audit (catch error if needed)
    try {
      const report = await performAudit(url, options, config);

      // Check for errors and proceed if all is well
      if (report['runtimeError'] != null) {
        console.error(report['runtimeError']['message']);
      }else{
        // Generate insert the report into the database tables
        console.log("storing ", template);
        await parseReportAndStore(url, template, report);
      }
    } catch (e) {
      console.error(e);
    }
  }
}



// Process a csv
async function processCSV (file_path) {
  try {
    // Read the file
    const file = fs.readFileSync(file_path);
    const csv_data = await neat_csv(file);

    // Validate that input CSV has URL and Template columns
    if (!csv_data[0].hasOwnProperty('URL') ||
        !csv_data[0].hasOwnProperty('Template')) {
      console.log('$$$Sorry, please make sure your CSV contains two columns labeled \'URL\' and \'Template\'.');
      db.disconnect();
      process.exit(-1);
    }else{
      console.log('CSV read successful!');
      console.log(JSON.stringify(csv_data))
    }

    // Do reporting on the file
    await doReporting(csv_data);

    // Recurring reports should be saved in the DB
    if (should_repeat) {
      for (let i = 0; i < csv_data.length; i++) {
        const record = csv_data[i];

        const url = record['URL'];
        const template = record['Template'];

        await db.query(`DELETE FROM urls WHERE url = $1`, [url]);
        await db.query(`INSERT INTO urls(url, template, interval, lifetime) VALUES($1, $2, $3, $4)`, [url, template, auto_report_interval, auto_report_lifetime]);
      }
    }

    // All done!
    console.log('Finished reporting!');
    db.disconnect();
  }catch (err) {
    console.log('$$$Something went wrong trying to read that file.');
    console.error(err);
  }
} 
/* 
async function doAutomaticReporting () {
  console.log('No file provided, doing automatic reporting...');

  // Read all URLs that need updating from the database
  // If the latest date is longer ago than the interval in days, we need to update
  const db_rows_that_need_updating = await db.query(`SELECT * FROM urls WHERE latest_date < now() - (interval::varchar(255) || 'days')::interval`);
  const urls_that_need_updating = [];

  db_rows_that_need_updating['rows'].forEach(async row => {
    urls_that_need_updating.push({
      URL: row['url'],
      Template: row['template'],
    });

    // Update the latest date for this report
    await db.query(`UPDATE urls SET latest_date = CURRENT_DATE WHERE id = $1`, [ row['id'] ]);
  });

  await doReporting(urls_that_need_updating);

  // Now delete all the URLs that need deleting
  console.log('Cleaning up old URLs from the DB...');
  await db.query(`DELETE FROM urls WHERE start_date < now() - (lifetime::varchar(255) || 'days')::interval`);

  console.log('Done automatically reporting!');

  db.disconnect();
  return;
}
 */
// Let's get started
// Connect to the database
db.connect(() => {
  // Check for file input
  const input_files = fs.readdirSync(path.join(__dirname, 'input'));

  if (input_files.length > 0) {
    console.log('We got a file! Process it...');
    processCSV(path.join(__dirname, 'input', input_files[0]));
  }else{
//    doAutomaticReporting();
    console.log("automatic reporting has been disabled... edit index.js to enable")
  }

  // If there is, this is an initial report
  // If there is NOT, this is an automatic report
  // Get the correct list of URLs
  // Run the reports
  // If this is an AUTOMATIC run, we are done
  // Otherwise, save the list of URLs in the database (if not exists)
});


// make errors more readable
const colors = require('colors');
Error.prepareStackTrace = (err, arr) => {
   let lines = err.stack.split('\n');
   lines = lines.map(x => x.includes('node_modules') ? colors.grey(x) : x);
   lines = lines.join('\n');
   err.stack = lines;
};
