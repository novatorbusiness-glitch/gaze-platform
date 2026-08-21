-- GAZE PLATFORM — ЧАСТЬ 1: ТАБЛИЦЫ
-- Вставь это в SQL Editor и нажми Run

create table if not exists masters (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  name text,
  phone text,
  specialty text[],
  avatar_url text,
  subscription_status text default 'trial',
  subscription_end date,
  is_gaze_graduate boolean default false,
  referral_code text unique,
  referred_by uuid references masters(id),
  created_at timestamp default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id),
  name text,
  phone text,
  notes text,
  last_visit date,
  total_visits integer default 0,
  total_spent decimal default 0,
  bonus_points integer default 0,
  created_at timestamp default now()
);

create table if not exists procedures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  master_id uuid references masters(id),
  service_type text,
  price decimal,
  notes text,
  photos text[],
  created_at timestamp default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  category text,
  cover_url text,
  is_premium boolean default false,
  created_at timestamp default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references masters(id),
  to_id uuid references masters(id),
  content text,
  is_read boolean default false,
  created_at timestamp default now()
);

create table if not exists bonuses (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id),
  client_id uuid references clients(id),
  type text,
  value decimal,
  description text,
  is_active boolean default true,
  expires_at date
);
