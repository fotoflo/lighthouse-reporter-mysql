use lighthouse;
show tables;

#drop table raw_reports;
drop table gds_audits, resource_chart,urls, savings_opportunities, scores, diagnostics ;

select distinct fetch_time from raw_reports;
select distinct fetch_time from resource_chart;

select * from diagnostics;
select * from raw_reports;
select count(*) from raw_reports;
select * from gds_audits;
select count(*) from resource_chart;
select * from resource_chart;
select * from resource_chart order by fetch_time desc;
select * from urls;
select * from savings_opportunities;
select count(*) from savings_opportunities;

select * from scores;
select * from test;

DELETE FROM savings_opportunities where unix_timestamp("2020-04-11 12:55:45");

select unix_timestamp("2020-04-11 12:55:45");

select id from raw_reports;

show tables;

SELECT * from raw_reports
    WHERE DATE(fetch_time) = '2020-04-08'
    AND template='HomePage' limit 1