const db = require('./database');
const fs = require('fs');


const test = async () => {
	  
	await db.query(`CREATE TABLE IF NOT EXISTS
	          resource_chart(
	            id SERIAL PRIMARY KEY,
	            audit_url VARCHAR(4096),
	            template VARCHAR(2048),
	            fetch_time TIMESTAMP,
	            fetch_date DATE,
	            resource_url VARCHAR(4096),
	            resource_type VARCHAR(2048),
	            start_time DECIMAL,
	            end_time DECIMAL,
	            load_time DECIMAL
	          )
	`);

	const query_text = "INSERT INTO test SET ?";
		const query_params = {
			"audit_url":"https://getcraft.com/briefs",
			"template":" GetCraft BriefsPage",
			"fetch_time":"2020-05-20T09:57:45.754Z",
			"fetch_date":"2020-05-20",
			"resource_url":"https://js.hs-banner.com/3851624.js",
			"resource_type":"Script",
			"start_time":3631.1089999508113,
			"load_time":null
		}


	console.log("querying scores")
	console.log(query_text)
	console.log(JSON.stringify(query_params))

	await db.query(query_text, query_params);

    process.exit();
}

test();