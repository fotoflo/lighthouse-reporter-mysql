const makeDb = require('./util').makeDb;

const settings_new = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT
  }

const settings_backup = {
    user: process.env.DB_USER_BACKUP,
    host: process.env.DB_HOST_BACKUP,
    database: process.env.DB_NAME_BACKUP,
    password: process.env.DB_PASS_BACKUP,
    port: process.env.DB_PORT_BACKUP
  }


if(!settings_new.database){
  console.log("\nNo New Database credentials in Envirnment, please edit .env and run source .env")
  process.exit();
}
if(!settings_backup.database){
  console.log("\nNo Backup Database credentials in Envirnment, please edit .env and run source .env")
  process.exit();
}

console.log(`logging into new database ${settings_new.database}
	sat ${settings_new.host}\n`)
console.log(`logging into backup database ${settings_backup.database}
	sat ${settings_backup.host}\n`)

const db_new = makeDb(settings_new);  
const db_backup = makeDb(settings_backup);  

db_new.query(`CREATE TABLE IF NOT EXISTS
                  raw_reports(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (4096) NOT NULL,
                    template VARCHAR (255),
                    fetch_time timestamp,
                    report JSON NOT NULL
                  )
`);

async function getRawReportRows(){
	return await db_backup.query('select id from raw_reports')
}


async function copyRawReport(i){

	const results = await db_backup.query(`select * from raw_reports where id = ${i};`);

	const query = `INSERT INTO raw_reports SET ?`;
	const insert = await db_new.query(query, results[0]);
	console.log(insert)
	return insert;
}

async function main(){
	let rows = await getRawReportRows()

	rows.forEach( async (rowDataPacket, i) => {
		console.log(`copying ${rowDataPacket.id}`)
		await copyRawReport(rowDataPacket.id)
	})

}

main()
