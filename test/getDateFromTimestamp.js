const expect = require('chai').expect;
const getDateFromTimestamp = require('../util').getDateFromTimestamp;

describe('getDateFromTimestamp()', ()=>{
	it(`should take mysql style string timestamp for april 11 2020
		like 2020-04-11 09:12:29.738
		and return a date "2020-04-11"`,
		() => {
			// arrange 
			const givenDate = '2020-04-11 09:12:29.738'

			// act
			const date = getDateFromTimestamp(givenDate)

			// assert
			expect(date).to.be.equal("2020-04-11")

		}
	);
	it(`should take postgres style string timestamp for april 11 2020
		like 2020-04-11T09:12:29.738Z
		and return a date "2020-04-11"`,
		() => {
			// arrange 
			const givenDate = '2020-04-11 17:05:32'

			// act
			const date = getDateFromTimestamp(givenDate)

			// assert
			expect(date).to.be.equal("2020-04-11")

		}
	);
	it(`should handle dates with 1 digit month or day
		and return a date "2020-01-01"`,
		() => {
			const givenDate = '2020-01-01T09:12:29.738Z'
			const date = getDateFromTimestamp(givenDate)
			expect(date).to.be.equal("2020-01-01")

		}
	);
	it(`should handle Date objects`,
		() => {
			const givenDate = new Date('2020-01-01T09:12:29.738Z')
			const date = getDateFromTimestamp(givenDate)
			expect(date).to.be.equal("2020-01-01")

		}
	);


})