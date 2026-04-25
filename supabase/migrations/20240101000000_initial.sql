-- Migration inicial: tablas del dashboard de consumo eléctrico

-- =====================================================
-- profiles
-- =====================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  datadis_username text,
  datadis_password_encrypted text,
  datadis_authorized_nif text,
  cups text,
  distributor_code text,
  point_type integer default 1,
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can only see their own profile"
  on profiles for all
  using (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- consumption
-- =====================================================
create table if not exists consumption (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  cups text not null,
  datetime timestamptz not null,
  consumption_kwh numeric(10,4) not null,
  period integer check (period in (1, 2, 3)),
  obtained_by_real_or_max boolean,
  created_at timestamptz default now(),
  unique(user_id, cups, datetime)
);

alter table consumption enable row level security;

create policy "Users can only see their own consumption"
  on consumption for all
  using (auth.uid() = user_id);

create index if not exists consumption_user_datetime
  on consumption(user_id, datetime desc);

create index if not exists consumption_cups_datetime
  on consumption(cups, datetime desc);

-- =====================================================
-- pvpc_prices (sin RLS — datos públicos)
-- =====================================================
create table if not exists pvpc_prices (
  id bigint generated always as identity primary key,
  datetime timestamptz not null unique,
  price_eur_kwh numeric(8,6) not null,
  created_at timestamptz default now()
);

create index if not exists pvpc_prices_datetime
  on pvpc_prices(datetime desc);

-- =====================================================
-- maximeter
-- =====================================================
create table if not exists maximeter (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  cups text not null,
  datetime timestamptz not null,
  max_power_kw numeric(8,3) not null,
  period integer check (period in (1, 2, 3)),
  created_at timestamptz default now(),
  unique(user_id, cups, datetime)
);

alter table maximeter enable row level security;

create policy "Users can only see their own maximeter"
  on maximeter for all
  using (auth.uid() = user_id);

create index if not exists maximeter_user_datetime
  on maximeter(user_id, datetime desc);
