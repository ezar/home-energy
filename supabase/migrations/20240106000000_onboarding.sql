-- Añade flag de onboarding para nuevos usuarios

alter table profiles
  add column if not exists onboarding_completed boolean not null default false;
