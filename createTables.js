function createTables(client){

  client.query(`CREATE TABLE IF NOT EXISTS
                  raw_reports(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (4096) NOT NULL,
                    template VARCHAR (255),
                    fetch_time timestamp,
                    report JSON NOT NULL
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  urls(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (4096) NOT NULL,
                    template VARCHAR (255),
                    start_date timestamp DEFAULT CURRENT_TIMESTAMP,
                    latest_date timestamp DEFAULT CURRENT_TIMESTAMP,
                    lifetime DECIMAL
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  gds_audits(
                    id SERIAL PRIMARY KEY,
                    url VARCHAR (4096) NOT NULL,
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    page_size DECIMAL,
                    page_size_mb DECIMAL,
                    first_contentful_paint DECIMAL,
                    max_potential_fid DECIMAL,
                    time_to_interactive DECIMAL,
                    first_meaningful_paint DECIMAL,
                    first_cpu_idle DECIMAL
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
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

  client.query(`CREATE TABLE IF NOT EXISTS
                  savings_opportunities(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(4096),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    audit_text VARCHAR(2048),
                    estimated_savings decimal
                  )
  `);

  client.query(`CREATE TABLE IF NOT EXISTS
                  diagnostics(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(4096),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    diagnostic_id VARCHAR(2048),
                    item_label VARCHAR(2048),
                    item_value DECIMAL
                  )
  `);


  client.query(`CREATE TABLE IF NOT EXISTS
                  scores(
                    id SERIAL PRIMARY KEY,
                    audit_url VARCHAR(4096),
                    template VARCHAR(2048),
                    fetch_time TIMESTAMP,
                    fetch_date DATE,
                    category VARCHAR(2048),
                    title VARCHAR(2048),
                    score INT
                  )
  `);
}

module.exports = createTables;