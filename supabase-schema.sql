-- ============================================
-- GAZE PLATFORM — Схема БД (из ТЗ, Часть 2)
-- Запустить: Supabase Dashboard → SQL Editor → Run
-- ============================================

-- Мастера (пользователи платформы)
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

-- Клиенты мастера
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

-- Процедуры (история визитов)
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

-- Статьи базы знаний
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  category text,
  cover_url text,
  is_premium boolean default false,
  created_at timestamp default now()
);

-- Сообщения (внутренний мессенджер)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references masters(id),
  to_id uuid references masters(id),
  content text,
  is_read boolean default false,
  created_at timestamp default now()
);

-- Бонусы и акции
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

-- ============================================
-- Row Level Security (RLS)
-- ============================================
alter table masters enable row level security;
alter table clients enable row level security;
alter table procedures enable row level security;
alter table articles enable row level security;
alter table messages enable row level security;
alter table bonuses enable row level security;

-- Мастер видит только себя
create policy "Masters see own profile" on masters
  for select using (id = auth.uid());

-- Мастер видит только своих клиентов
create policy "Masters see own clients" on clients
  for select using (master_id = auth.uid());

-- Мастер редактирует только своих клиентов
create policy "Masters edit own clients" on clients
  for all using (master_id = auth.uid());

-- Процедуры: мастер видит/редактирует свои
create policy "Masters see own procedures" on procedures
  for select using (master_id = auth.uid());
create policy "Masters edit own procedures" on procedures
  for all using (master_id = auth.uid());

-- Статьи: читают все авторизованные
create policy "Articles readable by all masters" on articles
  for select using (auth.role() = 'authenticated');

-- Сообщения: только свои
create policy "Masters see own messages" on messages
  for select using (from_id = auth.uid() or to_id = auth.uid());

-- Бонусы: только свои
create policy "Masters see own bonuses" on bonuses
  for select using (master_id = auth.uid());

-- ============================================
-- Демо-данные (опционально, для теста)
-- ============================================
insert into articles (title, content, category, is_premium) values
  ('Как упаковать профиль бьюти-мастера', 'Практическое руководство: фото, описание, отзывы, цена.', 'packaging', false),
  ('5 способов вернуть клиента через 30 дней', 'Рассылки, напоминания, персональные предложения.', 'clients', false),
  ('Нейромаркетинг в бьюти: почему клиенты выбирают вас', 'Метод GAZE: архитектура взгляда, первое впечатление, доверие.', 'promotion', true);
