const expect = require('chai').expect;
const makeDb = require('../util').makeDb;

const settings = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
  }

describe('makeDb', async () => {
	// arrange 
	const db = makeDb(settings);
	let results = await db.query("select 1;")
	it(`SELECT query should return a results object wrapped in an array`,
		() => {
			expect(typeof(results[0])).to.be.equal("array")
		}
	)
})



