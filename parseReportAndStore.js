
const db = require('./database');
const util = require('./util');

// This function parses the report and stores in the correct tables
exports.parseReportAndStore = async function (url, template, report) {
  // Get the values as needed
  // console.log("json: ", report)
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
  page_size = page_size / 1024; // <-- Convert bytes to kb
  page_size_mb = page_size / 1024; // <-- Convert kb to mb

  // Raw Reports Query
//   const raw_reports_query_text = "INSERT INTO raw_reports SET ? ";
// 
//   const raw_reports_query_params = {
//     url,
//     template,
//     fetch_time,
//     report: JSON.stringify(report)
//   };
  // console.log("Querying Raw Reports")
  // console.log(raw_reports_query_text)
  // console.log(JSON.stringify(raw_reports_query_params))

   // await db.query(raw_reports_query_text, raw_reports_query_params);


  // GDS AUDITS QUERY

  const gds_audit_query_text = `INSERT INTO gds_audits SET ?`;

  const gds_audit_query_params = {
      url,
      template,
      fetch_time,
      "fetch_date": util.getDateFromTimestamp(fetch_time),
      page_size,
      page_size_mb,
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
        fetch_date: util.getDateFromTimestamp(fetch_time),
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
      fetch_date: util.getDateFromTimestamp(fetch_time),
      resource_url: resource['url'],
      resource_type,
      start_time: resource['startTime'],
      end_time: resource['endTime'],
      load_time: (resource['endTime'] - resource['startTime']) || 0
    };
//
    try{
      await db.query(resource_chart_query_text, resource_chart_query_params);
    }catch(err){
      console.log("********* CAUGHT DB - RESOURCE ERROR *********")
      console.log("query_text", resource_chart_query_text)
      console.log("\nquery_params", resource_chart_query_params)
      console.log(err)
      debugger;
    } finally {
      //console.log("finally, resoruces")
    }
  }

// Insert each savings opportunity into the correct table
  const savings_opportunities_query_text = `INSERT INTO savings_opportunities SET ?`;

  for (let i = 0; i < savings_opportunities.length; i++) {
    const opportunity = savings_opportunities[i];

    const savings_opportunities_query_params = {
      audit_url: url,
      template,
      fetch_time,
      fetch_date: util.getDateFromTimestamp(fetch_time),
      audit_text: opportunity['audit_text'],
      estimated_savings: opportunity['estimated_savings']
    };

//    console.log(savings_opportunities_query_text)
//    console.log(savings_opportunities_query_params)
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
        fetch_date: util.getDateFromTimestamp(fetch_time),
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

