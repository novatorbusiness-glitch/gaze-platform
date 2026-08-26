/**
 * GAZE Platform — Supabase клиент (ЭТАП 3: персональные аккаунты, T7)
 *
 * Вход через Supabase Auth: signInAnonymously() при открытии мини-аппа из
 * Telegram. После входа auth.uid() = user_id мастера, и RLS отдаёт каждому
 * ТОЛЬКО его данные (masters/clients/procedures/bonuses — по user_id).
 * Сессия сохраняется (localStorage) — при переоткрытии тот же анонимный
 * пользователь остаётся тем же мастером.
 *
 * Вне Telegram (браузер/превью) Supabase Auth не вызывается — работает
 * демо-режим (dev-данные), см. resolveMaster в api.ts.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true, когда в .env есть и URL, и anon-ключ */
export const isSupabaseReady = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)

/* ------------------------------------------------------------------ */
/* RLS-строки таблиц (типы соответствуют supabase-schema.sql)          */
/* ------------------------------------------------------------------ */

export interface MasterRow {
  id: string
  telegram_id: number
  /** T7 — Привязка к auth.uid() (персональный аккаунт). null до первого входа. */
  user_id: string | null
  name: string | null
  phone: string | null
  specialty: string[] | null
  avatar_url: string | null
  subscription_status: string | null
  subscription_end: string | null
  is_gaze_graduate: boolean | null
  referral_code: string | null
  referred_by: string | null
  created_at: string
}

export interface ClientRow {
  id: string
  master_id: string
  name: string | null
  phone: string | null
  notes: string | null
  /** T15 — Ссылка (Telegram/соцсеть) */
  link?: string | null
  /** T15 — Краткое описание клиента */
  description?: string | null
  last_visit: string | null
  total_visits: number | null
  total_spent: number | string | null
  bonus_points: number | null
  created_at: string | null
}

export interface ProcedureRow {
  id: string
  client_id: string
  master_id: string
  service_type: string | null
  price: number | string | null
  cost: number | string | null
  notes: string | null
  photos: string[] | null
  created_at: string
}

export interface ArticleRow {
  id: string
  title: string | null
  content: string | null
  category: string | null
  cover_url: string | null
  is_premium: boolean | null
  created_at: string | null
}

export interface BonusRow {
  id: string
  master_id: string | null
  client_id: string | null
  type: string | null
  value: number | string | null
  description: string | null
  is_active: boolean | null
  expires_at: string | null
}

/** T10 — Курс академии (структура под реальные таблицы, пока в демо не используется) */
export interface CourseRow {
  id: string
  title: string | null
  subtitle: string | null
  category: string | null
  level: string | null
  cover_emoji: string | null
  accent: string | null
  is_premium: boolean | null
  readers: number | null
  created_at: string | null
}
