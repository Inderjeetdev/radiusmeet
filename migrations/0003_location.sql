-- Location fields for area + radius discovery
alter table profiles add column if not exists area text not null default '';
alter table profiles add column if not exists lat double precision;
alter table profiles add column if not exists lng double precision;
alter table profiles add column if not exists search_radius_km integer not null default 50;

alter table sample_profiles add column if not exists area text not null default 'Demo City';

update sample_profiles set area = 'Demo City' where id in ('s-mira', 's-julian', 's-noor');
update sample_profiles set area = 'Nearby Town' where id in ('s-eli', 's-sasha', 's-rafa');
