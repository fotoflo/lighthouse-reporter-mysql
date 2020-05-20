const expect = require('chai').expect;
const db = require('../database');
const getDateFromTimestamp = require('../util').getDateFromTimestamp;


describe('resource_chart queries', () => {
	// arrange 

	db.query(`CREATE TABLE IF NOT EXISTS
                  resource_chart(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (4096) NOT NULL,
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    page_size DECIMAL,
                    first_contentful_paint DECIMAL,
                    max_potential_fid DECIMAL,
                    time_to_interactive DECIMAL,
                    first_meaningful_paint DECIMAL,
                    first_cpu_idle DECIMAL
                  )
  `);

	xit(`should store resource_chart in the db successfully`,
		async () => {
			const query_text = `INSERT INTO resource_chart SET ?`

			const params = {
				"url":"https://support.google.com/datastudio/answer/7540410?hl=en",
				"template":"GDS_Help_Center",
				"fetch_time":"2020-04-12T00:18:33.883Z",
				"fetch_date": getDateFromTimestamp("2020-04-12T00:18:33.883Z"),
				"page_size":465.8779296875,
				"first_contentful_paint":1502.799,
				"max_potential_fid":207,
				"time_to_interactive":4593.723,
				"first_meaningful_paint":2556.5765,
				"first_cpu_idle":4593.723000000001
			}

			// act
			let result = await db.query(query_text, params);
			console.log(Object.keys(result))
			//console.log(result.values)
			// assert
			expect(result.values.template).to.be.equal("GDS_Help_Center")

			// clean up
			await db.query('DELETE FROM resource_chart where unix_timestamp("2020-04-11 12:55:45")')
		}
	)
})



