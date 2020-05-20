const db = require('./database');
const fs = require('fs');

const url = "http://google.com"
const template = "google"

let rawdata = fs.readFileSync('./sample-report.json');
let report = JSON.parse(rawdata);

const fetch_time = report['fetchTime'];
console.log("fetch_time", typeof(fetch_time), fetch_time)

const test = async () => {
	 await db.query('drop table scores');
	  
	 await db.query(`CREATE TABLE IF NOT EXISTS
                  test(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    category VARCHAR(2048),
                    title VARCHAR(2048),
                    score FLOAT
                  )
	  `);

	  const scores_query_text = "INSERT INTO test SET ?";

	  const categories = report.categories

	  Object.keys(categories).forEach( async (item) => {
	    const scores_query_params = {
	        audit_url: url,
	        template,
	        fetch_time,
	        category: categories[item].id,
	        title: categories[item].title,
	        score: categories[item].score
	    };

	    console.log("querying scores")
	    console.log(scores_query_text)
	    console.log(JSON.stringify(scores_query_params))

	    await db.query(scores_query_text, scores_query_params);

	    process.exit();
	  })
}

test();