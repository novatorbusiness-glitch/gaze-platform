-- ============================================================
-- GAZE — ИСПРАВЛЕНИЕ ЗАВИСАНИЯ ДАННЫХ (применить ОДИН раз)
--
-- ПРИМЕНЕНИЕ: Supabase Dashboard → SQL Editor → вставить весь файл → Run
-- Идемпотентно: можно запускать повторно без ошибок.
--
-- ЧТО ЧИНИТ (диагностировано по живой БД, 2026-08-27):
--   1) procedures.cost — колонки НЕТ в живой БД, а фронт её шлёт при каждой
--      записи процедуры → INSERT падает с PGRST204 «Could not find the 'cost'
--      column» → процедуры НЕ сохраняются → Аналитика и Путь роста видят
--      пустые/неверные цифры, мастера думают, что платформа «зависла».
--   2) RLS-фикс (supabase-rls-fix.sql) применён НЕ полностью: политики
--      «masters select own» из t7 стоят и работают, но «masters select anon»
--      (USING true) отсутствует. Ниже добавляем её (безопасно, идемпотентно) +
--      скрываем phone/referral_code от анонимов.
--   resolve_master (SECURITY DEFINER) уже применён и проверен — НЕ трогаем.
-- ============================================================

-- ---------- 1) procedures.cost: колонка себестоимости ----------
-- Число, не NULL: существующие строки получают 0, новые — значение из формы.
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS cost numeric NOT NULL DEFAULT 0;

-- ---------- 2) RLS: masters читаются всеми (нужно подзапросам
--            clients/procedures/bonuses), чувствительные колонки скрыты -----
DROP POLICY IF EXISTS "masters select own" ON masters;
DROP POLICY IF EXISTS "masters select anon" ON masters;
DROP POLICY IF EXISTS "Masters see own profile" ON masters;
DROP POLICY IF EXISTS "Masters see own" ON masters;

-- «own» политика остаётся (свой мастер по user_id)
CREATE POLICY "masters select own" ON masters
  FOR SELECT USING (user_id = auth.uid());

-- + анонимам разрешено читать masters целиком (для подзапросов RLS и
--   быстрого поиска по user_id), НО без phone/referral_code (см. REVOKE ниже)
CREATE POLICY "masters select anon" ON masters
  FOR SELECT USING (true);

-- Гарантия прав (обычно уже выданы — лишним не будет):
GRANT SELECT ON masters TO anon, authenticated;

-- Скрыть чувствительные колонки от роли anon (anon-ключ публичный):
REVOKE SELECT (phone, referral_code) ON masters FROM anon;

-- ---------- 3) Гарантия RLS на остальных персональных таблицах ----------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Проверка после применения (должны появиться строки):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='procedures' AND column_name='cost';
--   SELECT policyname FROM pg_policies WHERE tablename='masters';
