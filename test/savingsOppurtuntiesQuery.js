const expect = require('chai').expect;
const db = require('../database');


describe('savings_opportunities queries', () => {
	// arrange 

	db.query(`CREATE TABLE IF NOT EXISTS
                  savings_opportunities(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(2048),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    audit_text VARCHAR(2048),
                    estimated_savings decimal
                  )
  `);

	it(`should store savings_opportunities in the db successfully`,
		async () => {
			const query_text = `INSERT INTO savings_opportunities SET ?`

			const params = { 
				audit_url: 'https://getcraft.com',
				template: 'HomePage',
				fetch_time: '2020-04-11T12:55:45.234Z',
				fetch_date: '2020-04-11',
				audit_text: 'Use video formats for animated content',
				estimated_savings: 0 
			}

			// act
			let result = await db.query(query_text, params);
			//console.log(result.values)
			// assert
			expect(result.values.template).to.be.equal("HomePage")

			// clean up
			await db.query('DELETE FROM savings_opportunities where unix_timestamp("2020-04-11 12:55:45")')
		}
	)
})



