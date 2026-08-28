-- ============================================================
-- GAZE — RLS FIX: новые аккаунты мастеров видят свои данные
-- (новые пользователи: signInAnonymously → resolve_master → свои данные)
--
-- ПРИМЕНЕНИЕ: Supabase Dashboard → SQL Editor → вставить весь файл → Run
-- Идемпотентно: можно запускать повторно без ошибок.
--
-- Что делает:
--  1) masters: чтение разрешено ВСЕМ (anon + authenticated) — чтобы
--     resolve_master, быстрый путь по user_id и подзапросы в политиках
--     clients/procedures/bonuses (они читают masters) всегда работали;
--  2) чувствительные колонки masters.phone и masters.referral_code
--     скрыты от роли anon (anon-ключ публичный — это защита от утечки;
--     сами мастера и resolve_master видят их по-прежнему);
--  3) запись в masters — только под СВОИМ user_id = auth.uid();
--  4) resolve_master: безопасная версия (SECURITY DEFINER = обходит RLS,
--     т.е. не блокируется политиками masters; вызывается анонимами).
-- ============================================================

-- ---------- 1) ЧТЕНИЕ masters: разрешено всем ----------
DROP POLICY IF EXISTS "masters select own" ON masters;
DROP POLICY IF EXISTS "masters select anon" ON masters;
DROP POLICY IF EXISTS "Masters see own profile" ON masters;
DROP POLICY IF EXISTS "Masters see own" ON masters;

CREATE POLICY "masters select anon" ON masters
  FOR SELECT USING (true);

-- Гарантия прав (в Supabase обычно уже выдано по умолчанию, лишним не будет):
GRANT SELECT ON masters TO anon, authenticated;

-- ---------- 2) Скрыть чувствительные колонки от anon ----------
-- anon-ключ лежит в клиентском бандле (публичный!), поэтому phone и
-- referral_code не должны читаться без входа. Владелец функции
-- resolve_master (SECURITY DEFINER) и authenticated (сами мастера)
-- видят их как раньше. Если хотите максимально простой вариант —
-- удалите эти две строки (тогда anon видит phone).
REVOKE SELECT (phone, referral_code) ON masters FROM anon;

-- ---------- 3) ЗАПИСЬ masters: только под своим user_id ----------
DROP POLICY IF EXISTS "masters insert own" ON masters;
DROP POLICY IF EXISTS "masters update own" ON masters;
DROP POLICY IF EXISTS "Masters insert own profile" ON masters;
DROP POLICY IF EXISTS "Masters update own profile" ON masters;

CREATE POLICY "masters insert own" ON masters
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "masters update own" ON masters
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------- 4) resolve_master: безопасная версия ----------
-- SECURITY DEFINER: внутренние SELECT/INSERT/UPDATE по masters НЕ
-- фильтруются RLS (функция работает «поверх» политик) — это и есть
-- «работает без auth.uid()/без доступа к masters» на уровне RLS.
-- Требование аутентификации (auth.uid() NOT NULL) сохраняем: иначе любой
-- аноним мог бы создавать мастеров через RPC без привязки к аккаунту.
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

  IF p_telegram_id IS NULL OR p_telegram_id <= 0 THEN
    RAISE EXCEPTION 'invalid telegram_id';
  END IF;

  SELECT * INTO m FROM masters WHERE telegram_id = p_telegram_id LIMIT 1;

  IF NOT FOUND THEN
    -- Новый мастер → пустой аккаунт (trial-подписка), user_id = auth.uid()
    INSERT INTO masters (telegram_id, name, user_id, subscription_status)
    VALUES (p_telegram_id, COALESCE(NULLIF(p_name, ''), 'Мастер'), v_uid, 'trial')
    RETURNING * INTO m;
  ELSE
    -- Существующий мастер → привязываем auth-пользователя
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
