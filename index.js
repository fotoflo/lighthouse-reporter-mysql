// dependencies
const lighthouse = require('lighthouse');
const chrome_launcher = require('chrome-launcher');
const db = require('./database');
const fs = require('fs');
const path = require('path');
const neat_csv = require('neat-csv');
const dotenv = require('dotenv');

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
  }).catch(downTheGauntlet => {
    throw downTheGauntlet; // <-- CHALLENGE ACCEPTED
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

// This function parses the report and stores in the correct tables
async function parseReportAndStore (url, template, report) {
  // Get the values as needed
  const fetch_time = report['fetchTime'];
  let page_size = report['audits']['total-byte-weight']['numericValue'];
  const first_contentful_paint = report['audits']['first-contentful-paint']['numericValue'];
  const max_potential_fid = report['audits']['max-potential-fid']['numericValue'];
  const time_to_interactive = report['audits']['interactive']['numericValue'];
  const first_meaningful_paint = report['audits']['first-meaningful-paint']['numericValue'];
  const first_cpu_idle = report['audits']['first-cpu-idle']['numericValue'];

  // These are lists and will have to be iterated
  const network_resources = report['audits']['network-requests']['details']['items'];
  const savings_opportunities = [];

  // Loop through the audits to find savings opportunities
  for (const audit_name in report['audits']) {
    if (!report['audits'].hasOwnProperty(audit_name)) {
      continue; // <-- Sanity check
    }

    const audit = report['audits'][audit_name];

    if (audit.hasOwnProperty('details') && audit['details'] != null) {
      if (audit['details']['type'] == 'opportunity') {
        savings_opportunities.push({
          audit_text: audit['title'],
          estimated_savings: audit['details']['overallSavingsMs']
        });
      }
    }
  }

  // Locate all diagnostics
  const diagnostics = [];
  let current_list_of_items = [];

  // These are the diagnostics we care about
  //  mainthread-work-breakdown
  //  bootup-time
  //  font-display
  //  third-party-summary
  //  dom-size

  // Main thread work breakdown
  if (report['audits']['mainthread-work-breakdown']['score'] != 1 &&
      report['audits']['mainthread-work-breakdown']['score'] != undefined) {
        report['audits']['mainthread-work-breakdown']['details']['items'].forEach(item => {
          current_list_of_items.push({
            label: item['groupLabel'],
            value: item['duration']
          });
        });
  }
  diagnostics.push({
    diagnostic_id: 'mainthread-work-breakdown',
    items: current_list_of_items,
  });
  current_list_of_items = [];

  // bootup-time
  if (report['audits']['bootup-time']['score'] != 1 &&
      report['audits']['bootup-time']['score'] != undefined) {
        report['audits']['bootup-time']['details']['items'].forEach(item => {
          current_list_of_items.push({
            label: item['url'],
            value: item['total']
          });
        });
  }
  diagnostics.push({
    diagnostic_id: 'bootup-time',
    items: current_list_of_items,
  });
  current_list_of_items = [];

  // font-display
  if (report['audits']['font-display']['score'] != 1 &&
      report['audits']['font-display']['score'] != undefined) {
        report['audits']['font-display']['details']['items'].forEach(item => {
          current_list_of_items.push({
            label: item['url'],
            value: item['wastedMs']
          });
        });
  }
  diagnostics.push({
    diagnostic_id: 'font-display',
    items: current_list_of_items,
  });
  current_list_of_items = [];

  // third-party-summary
  if (report['audits']['third-party-summary']['score'] != 1 &&
      report['audits']['third-party-summary']['score'] != undefined) {
        report['audits']['third-party-summary']['details']['items'].forEach(item => {
          current_list_of_items.push({
            label: item['entity']['text'],
            value: item['blockingTime']
          });
        });
  }
  diagnostics.push({
    diagnostic_id: 'third-party-summary',
    items: current_list_of_items,
  });
  current_list_of_items = [];

  // dom-size
  if (report['audits']['dom-size']['score'] != 1 &&
      report['audits']['dom-size']['score'] != undefined) {
        report['audits']['dom-size']['details']['items'].forEach(item => {
          current_list_of_items.push({
            label: item['statistic'],
            value: parseFloat(item['value'].replace(',', ''))
          });
        });
  }
  diagnostics.push({
    diagnostic_id: 'dom-size',
    items: current_list_of_items,
  });

  // Perform some conversions
  page_size = page_size / 1024; // <-- Convert KB to MB

  // Raw Reports Query
  const raw_reports_query_text = "INSERT INTO raw_reports SET ? ";

  const raw_reports_query_params = {
    url,
    template,
    fetch_time,
    report: JSON.stringify(report)
  };
  // console.log("Querying Raw Reports")
  // console.log(raw_reports_query_text)
  // console.log(JSON.stringify(raw_reports_query_params))

  await db.query(raw_reports_query_text, raw_reports_query_params);


  // GDS AUDITS QUERY

  const gds_audit_query_text = `INSERT INTO gds_audits SET ?`;

  const gds_audit_query_params = {
      url,
      template,
      fetch_time,
      page_size,
      first_contentful_paint,
      max_potential_fid,
      time_to_interactive,
      first_meaningful_paint,
      first_cpu_idle
  };
// 
//   console.log("querying GDS Audits")
//   console.log(gds_audit_query_text)
//   console.log(JSON.stringify(gds_audit_query_params))

  await db.query(gds_audit_query_text, gds_audit_query_params);


  // SCORES

  const scores_query_text = "INSERT INTO scores SET ?";
  const categories = report.categories

  Object.keys(categories).forEach( async (item) => {
    const scores_query_params = {
        audit_url: url,
        template,
        fetch_time,
        category: categories[item].id,
        title: categories[item].title,
        score: categories[item].score * 100
    };

    // console.log("querying scores")
    // console.log(scores_query_text)
    // console.log(JSON.stringify(scores_query_params))

    await db.query(scores_query_text, scores_query_params);

  })

  // INSERT RESOURCES

  const resource_chart_query_text = `INSERT INTO resource_chart SET ?`;

  // Insert all resources from the resource table into the resource chart table
  for (let i = 0; i < network_resources.length; i++) {
    const resource = network_resources[i];

    // Filter undefined resource types
    let resource_type = resource['resourceType'];
    if (resource_type == null) {
      resource_type = 'Other';
    }

    // console.log("resrouce url: ", resource['url'])

    const resource_chart_query_params = {
      audit_url: url,
      template,
      fetch_time,
      resource_url: resource['url'],
      resource_type,
      start_time: resource['startTime'],
      end_time: resource['endTime']
    };
// 
//     console.log("Resource Charts")
//     console.log(resource_chart_query_text)
//     console.log(JSON.stringify(resource_chart_query_params))
// 
    await db.query(resource_chart_query_text, resource_chart_query_params);
  }

// Insert each savings opportunity into the correct table
  const savings_opportunities_query_text = `INSERT INTO savings_opportunities SET ?`;

  for (let i = 0; i < savings_opportunities.length; i++) {
    const opportunity = savings_opportunities[i];

    const savings_opportunities_query_params = {
      audit_url: url,
      template,
      fetch_time,
      audit_text: opportunity['audit_text'],
      estimated_savings: opportunity['estimated_savings']
    };
// 
//     console.log("Savings opportunities")
//     console.log(savings_opportunities_query_text)
//     console.log(JSON.stringify(savings_opportunities_query_params))

    await db.query(savings_opportunities_query_text, savings_opportunities_query_params);
  }


// Insert each diagnostic audit into the correct table
  const diagnostics_query_text = `INSERT INTO diagnostics SET ?`;

  for (let i = 0; i < diagnostics.length; i++) {
    const diag = diagnostics[i];

    for (let j = 0; j < diag['items'].length; j++) {
      const item = diag['items'][j];

      const diagnostics_query_params = {
        audit_url: url,
        template,
        fetch_time,
        diagnostic_id: diag['diagnostic_id'],
        item_label: item['label'],
        item_value: item['value']
      };

      // console.log("Diagnostics")
      // console.log(diagnostics_query_text)
      // console.log(JSON.stringify(diagnostics_query_params))

      await db.query(diagnostics_query_text, diagnostics_query_params);
    }
  }
}



// Process a file
async function processFile (file_path) {
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
    processFile(path.join(__dirname, 'input', input_files[0]));
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
