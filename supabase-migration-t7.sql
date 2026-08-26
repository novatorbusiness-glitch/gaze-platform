-- ============================================================
-- GAZE T7 — ПЕРСОНАЛЬНЫЕ АККАУНТЫ МАСТЕРОВ
-- Supabase Auth (анонимный вход из Telegram WebApp) + RLS по user_id
-- Выполнить: Supabase Dashboard → SQL Editor → Run
-- (идемпотентно: можно запускать повторно)
-- ============================================================

-- 0) Сброс политик из прошлых запусков (чтобы скрипт был идемпотентным)
DROP POLICY IF EXISTS "masters select own" ON masters;
DROP POLICY IF EXISTS "masters insert own" ON masters;
DROP POLICY IF EXISTS "masters update own" ON masters;
DROP POLICY IF EXISTS "clients select own" ON clients;
DROP POLICY IF EXISTS "clients insert own" ON clients;
DROP POLICY IF EXISTS "clients update own" ON clients;
DROP POLICY IF EXISTS "procedures select own" ON procedures;
DROP POLICY IF EXISTS "procedures insert own" ON procedures;
DROP POLICY IF EXISTS "procedures update own" ON procedures;
DROP POLICY IF EXISTS "bonuses select own" ON bonuses;
DROP POLICY IF EXISTS "bonuses insert own" ON bonuses;
DROP POLICY IF EXISTS "reminders select own" ON reminders;
DROP POLICY IF EXISTS "reminders insert own" ON reminders;
DROP POLICY IF EXISTS "subscriptions select own" ON subscriptions;
DROP POLICY IF EXISTS "articles readable by all" ON articles;

-- 1) masters.user_id — привязка к auth.uid() (персональный аккаунт)
ALTER TABLE masters ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_masters_user_id ON masters(user_id);
CREATE INDEX IF NOT EXISTS idx_masters_telegram_id ON masters(telegram_id);

-- 2) Таблица напоминаний
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid REFERENCES masters(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type text DEFAULT 'return',          -- warmup | return | birthday
  message text,
  scheduled_for timestamptz,
  status text DEFAULT 'pending',       -- pending | sent | skipped
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_master ON reminders(master_id);

-- 3) Таблица подписок
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id uuid REFERENCES masters(id) ON DELETE CASCADE,
  status text DEFAULT 'trial',         -- trial | active | cancelled
  plan text DEFAULT 'free',
  price numeric DEFAULT 0,
  trial_start date,
  trial_end date,
  current_period_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_master ON subscriptions(master_id);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 4) RLS — masters: каждый видит ТОЛЬКО СВОЙ аккаунт (user_id = auth.uid())
DROP POLICY IF EXISTS "Masters see own profile" ON masters;
DROP POLICY IF EXISTS "Masters insert own profile" ON masters;
DROP POLICY IF EXISTS "Masters update own profile" ON masters;
CREATE POLICY "masters select own" ON masters FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "masters insert own" ON masters FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "masters update own" ON masters FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5) RLS — clients: только СВОИ (через своего мастера)
DROP POLICY IF EXISTS "Masters see own clients" ON clients;
DROP POLICY IF EXISTS "Masters edit own clients" ON clients;
DROP POLICY IF EXISTS "clients select own" ON clients;
DROP POLICY IF EXISTS "clients insert own" ON clients;
DROP POLICY IF EXISTS "clients update own" ON clients;
CREATE POLICY "clients select own" ON clients FOR SELECT USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "clients insert own" ON clients FOR INSERT WITH CHECK (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "clients update own" ON clients FOR UPDATE USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
) WITH CHECK (master_id IN (SELECT id FROM masters WHERE user_id = auth.uid()));

-- 6) RLS — procedures: только СВОИ
DROP POLICY IF EXISTS "Masters see own procedures" ON procedures;
DROP POLICY IF EXISTS "Masters edit own procedures" ON procedures;
DROP POLICY IF EXISTS "procedures select own" ON procedures;
DROP POLICY IF EXISTS "procedures insert own" ON procedures;
DROP POLICY IF EXISTS "procedures update own" ON procedures;
CREATE POLICY "procedures select own" ON procedures FOR SELECT USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "procedures insert own" ON procedures FOR INSERT WITH CHECK (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "procedures update own" ON procedures FOR UPDATE USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
) WITH CHECK (master_id IN (SELECT id FROM masters WHERE user_id = auth.uid()));

-- 7) RLS — bonuses: только СВОИ
DROP POLICY IF EXISTS "Masters see own bonuses" ON bonuses;
CREATE POLICY "bonuses select own" ON bonuses FOR SELECT USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "bonuses insert own" ON bonuses FOR INSERT WITH CHECK (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

-- 8) RLS — reminders / subscriptions: только СВОИ
CREATE POLICY "reminders select own" ON reminders FOR SELECT USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "reminders insert own" ON reminders FOR INSERT WITH CHECK (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);
CREATE POLICY "subscriptions select own" ON subscriptions FOR SELECT USING (
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

-- 9) Статьи базы знаний — читают все (контент, не персональные данные)
DROP POLICY IF EXISTS "Articles readable by all masters" ON articles;
CREATE POLICY "articles readable by all" ON articles FOR SELECT USING (true);

-- 10) resolve_master: создать / найти / привязать аккаунт по telegram_id
CREATE OR REPLACE FUNCTION resolve_master(p_telegram_id bigint, p_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m masters%ROWTYPE;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO m FROM masters WHERE telegram_id = p_telegram_id LIMIT 1;

  IF NOT FOUND THEN
    -- Новый мастер → ПУСТОЙ аккаунт (0 клиентов, 0 процедур, trial-подписка)
    INSERT INTO masters (telegram_id, name, user_id, subscription_status)
    VALUES (p_telegram_id, COALESCE(NULLIF(p_name, ''), 'Мастер'), v_uid, 'trial')
    RETURNING * INTO m;
  ELSE
    -- Существующий мастер → привязываем auth-пользователя (telegram_id ↔ auth.uid())
    IF m.user_id IS DISTINCT FROM v_uid THEN
      UPDATE masters SET user_id = v_uid WHERE id = m.id;
      m.user_id := v_uid;
    END IF;
    -- Имя берём из Telegram, если в записи пусто
    IF p_name IS NOT NULL AND NULLIF(p_name, '') IS NOT NULL
       AND (m.name IS NULL OR m.name = '') THEN
      UPDATE masters SET name = p_name WHERE id = m.id;
      m.name := p_name;
    END IF;
  END IF;

  RETURN to_jsonb(m);
END;
$$;

REVOKE ALL ON FUNCTION resolve_master(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_master(bigint, text) TO anon, authenticated;
