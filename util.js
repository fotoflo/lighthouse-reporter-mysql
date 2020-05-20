const util = require( 'util' );
const mysql = require( 'mysql' );

function getDateFromTimestamp(givenDate){
	if(typeof(givenDate) != Date){ // handle strings
		givenDate = new Date(givenDate);
	}

	var day = givenDate.getDate();
	var month = givenDate.getMonth() + 1 ; //Be careful! January is 0 not 1
	var year = givenDate.getFullYear();

	month = month.toString().length == 1 ? '0' + month : month;
	day = day.toString().length == 1 ?  '0' + day :  day;

	var dateString = year + "-" + month  + "-" + day;
	return dateString;
}

function getDateRangeArray(start_date, end_date){
//https://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates
    let dateArray = new Array();
    let currentDate = new Date(start_date)
    let endDate = new Date(end_date)
    while (currentDate <= endDate) {
        console.log("currentDate: ", currentDate);
        dateArray.push(formatDate(new Date (currentDate) ) );
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function formatDate(date) {
    let d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}


function makeDb( config ) {
  const connection = mysql.createConnection( config );
  return {
    query( sql, args ) {
      return util.promisify( connection.query )
        .call( connection, sql, args );
    },
    close() {
      return util.promisify( connection.end ).call( connection );
    }
  };
}

module.exports= {
	getDateFromTimestamp: getDateFromTimestamp,
	makeDb: makeDb,
	getDateRangeArray: getDateRangeArray
}