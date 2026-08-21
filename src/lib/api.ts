/**
 * GAZE Platform — слой данных (ЭТАП 2)
 *
 * Все запросы идут по правилам RLS: клиенты/процедуры/бонусы — строго по
 * своему master_id; мастер определяется по telegram_id из Telegram WebApp.
 * Без Supabase Auth (этап 3) анонимные вставки/чтения под RLS будут падать —
 * ошибки переводятся в человекочитаемый вид (см. friendlyError).
 */
import type { Article, Client, Master, Procedure } from './mock'
import {
  isSupabaseReady,
  supabase,
  type ArticleRow,
  type BonusRow,
  type ClientRow,
  type MasterRow,
  type ProcedureRow,
} from './supabase'
import { getTelegramUserId, getTelegramUserName } from './telegram'

/* ------------------------------------------------------------------ */
/* Модели                                                              */
/* ------------------------------------------------------------------ */

export interface Bonus {
  id: string
  master_id: string | null
  client_id: string | null
  type: string
  value: number
  description: string
  is_active: boolean
  expires_at: string | null
}

export interface DashboardData {
  clients: Client[]
  procedures: Procedure[]
}

export interface ClientProfileData {
  client: Client | null
  history: Procedure[]
  bonuses: Bonus[]
}

export interface MasterResolution {
  master: Master | null
  telegramId: number | null
  /** true, если работаем вне Telegram (dev-режим: браузер) */
  isDev: boolean
  error: string | null
}

export interface NewProcedureInput {
  client_id: string
  master_id: string
  service_type: string
  price: number
  notes?: string
}

/* ------------------------------------------------------------------ */
/* Мапперы PostgREST → интерфейсы приложения                           */
/* (decimal-поля PostgREST отдаёт строкой — приводим к number)        */
/* ------------------------------------------------------------------ */

function mapMaster(row: MasterRow): Master {
  return {
    id: row.id,
    telegram_id: row.telegram_id,
    name: row.name ?? 'Мастер',
    phone: row.phone ?? '',
    specialty: row.specialty ?? [],
    avatar_url: row.avatar_url ?? null,
    subscription_status: (row.subscription_status as Master['subscription_status']) ?? 'trial',
    subscription_end: row.subscription_end ?? '',
    is_gaze_graduate: row.is_gaze_graduate ?? false,
    referral_code: row.referral_code ?? '',
    referred_by: row.referred_by ?? null,
    created_at: row.created_at,
  }
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    master_id: row.master_id,
    name: row.name ?? 'Клиент',
    phone: row.phone ?? '',
    notes: row.notes ?? '',
    last_visit: row.last_visit ?? '',
    total_visits: Number(row.total_visits ?? 0),
    total_spent: Number(row.total_spent ?? 0),
    bonus_points: Number(row.bonus_points ?? 0),
    created_at: row.created_at ?? '',
  }
}

function mapProcedure(row: ProcedureRow): Procedure {
  return {
    id: row.id,
    client_id: row.client_id,
    master_id: row.master_id,
    service_type: row.service_type ?? '',
    price: Number(row.price ?? 0),
    notes: row.notes ?? '',
    photos: row.photos ?? [],
    created_at: row.created_at,
  }
}

function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title ?? '',
    content: row.content ?? '',
    category: (row.category as Article['category']) ?? 'promotion',
    cover_url: row.cover_url ?? null,
    is_premium: row.is_premium ?? false,
    created_at: row.created_at ?? '',
  }
}

function mapBonus(row: BonusRow): Bonus {
  return {
    id: row.id,
    master_id: row.master_id,
    client_id: row.client_id,
    type: row.type ?? '',
    value: Number(row.value ?? 0),
    description: row.description ?? '',
    is_active: row.is_active ?? true,
    expires_at: row.expires_at ?? null,
  }
}

/* ------------------------------------------------------------------ */
/* Ошибки                                                              */
/* ------------------------------------------------------------------ */

/** Перевод ошибок Supabase/RLS в человекочитаемые сообщения */
export function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (/row-level security|violates row-level|permission denied|duplicate key/i.test(message)) {
    return 'Нет доступа к данным (RLS). Вход через Supabase Auth подключим на этапе 3 — сейчас данные читаются только под своим master_id.'
  }
  if (/fetch|network|Failed to fetch|ERR_/i.test(message)) {
    return 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.'
  }
  return message
}

/* ------------------------------------------------------------------ */
/* Мастер: определение по telegram_id                                  */
/* ------------------------------------------------------------------ */

/** Dev-фолбэк вне Telegram (браузер): telegram_id из mock-данных этапа 1 */
const DEV_TELEGRAM_ID = 123456789
const DEV_NAME = 'Анна'

let cachedResolution: MasterResolution | null = null

/**
 * Определяет текущего мастера по telegram_id (WebApp.initDataUnsafe.user.id).
 * Мастера нет в БД — создаём upsert-ом по telegram_id.
 * При RLS без auth вставка упадёт → возвращаем error (этап 3: Supabase Auth).
 */
export async function resolveMaster(force = false): Promise<MasterResolution> {
  if (cachedResolution && !force) return cachedResolution

  if (!isSupabaseReady) {
    return {
      master: null,
      telegramId: null,
      isDev: false,
      error: 'Supabase не настроен. Проверь VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env',
    }
  }

  const tgId = getTelegramUserId()
  const isDev = tgId === null
  const telegramId = tgId ?? DEV_TELEGRAM_ID
  const tgName = getTelegramUserName()
  const name = tgName ?? (isDev ? DEV_NAME : 'Мастер GAZE')

  try {
    const { data, error } = await supabase
      .from('masters')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle()

    if (error) throw error

    if (data) {
      cachedResolution = { master: mapMaster(data), telegramId, isDev, error: null }
      return cachedResolution
    }

    // Мастера нет — upsert по telegram_id (создаст запись с trial-подпиской)
    const { data: inserted, error: insertError } = await supabase
      .from('masters')
      .upsert({ telegram_id: telegramId, name, subscription_status: 'trial' }, { onConflict: 'telegram_id' })
      .select()
      .maybeSingle()

    if (insertError) throw insertError
    if (!inserted) {
      return { master: null, telegramId, isDev, error: 'Не удалось создать запись мастера.' }
    }

    cachedResolution = { master: mapMaster(inserted), telegramId, isDev, error: null }
    return cachedResolution
  } catch (err) {
    // RLS без Supabase Auth блокирует upsert анониму — ожидаемо на этапе 2
    return { master: null, telegramId, isDev, error: friendlyError(err) }
  }
}

/* ------------------------------------------------------------------ */
/* Чтение данных                                                       */
/* ------------------------------------------------------------------ */

export async function fetchDashboard(masterId: string): Promise<DashboardData> {
  const [clientsRes, proceduresRes] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('master_id', masterId)
      .order('last_visit', { ascending: false }),
    supabase
      .from('procedures')
      .select('*')
      .eq('master_id', masterId)
      .order('created_at', { ascending: false }),
  ])

  if (clientsRes.error) throw clientsRes.error
  if (proceduresRes.error) throw proceduresRes.error

  return {
    clients: (clientsRes.data ?? []).map(mapClient),
    procedures: (proceduresRes.data ?? []).map(mapProcedure),
  }
}

export async function fetchClients(masterId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('master_id', masterId)
    .order('last_visit', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapClient)
}

export async function fetchClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle()

  if (error) throw error
  return data ? mapClient(data) : null
}

export async function fetchClientProcedures(clientId: string): Promise<Procedure[]> {
  const { data, error } = await supabase
    .from('procedures')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapProcedure)
}

export async function fetchBonuses(masterId: string): Promise<Bonus[]> {
  const { data, error } = await supabase
    .from('bonuses')
    .select('*')
    .eq('master_id', masterId)

  if (error) throw error
  return (data ?? []).map(mapBonus)
}

export async function fetchClientProfile(clientId: string, masterId: string): Promise<ClientProfileData> {
  const [client, history, bonuses] = await Promise.all([
    fetchClient(clientId),
    fetchClientProcedures(clientId),
    fetchBonuses(masterId),
  ])
  return { client, history, bonuses }
}

export async function fetchArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapArticle)
}

/* ------------------------------------------------------------------ */
/* Запись                                                              */
/* ------------------------------------------------------------------ */

/**
 * Записывает процедуру и обновляет статистику клиента:
 * last_visit = сегодня, total_visits +1, total_spent + price.
 */
export async function addProcedure(input: NewProcedureInput): Promise<Procedure> {
  const { data, error } = await supabase
    .from('procedures')
    .insert({
      client_id: input.client_id,
      master_id: input.master_id,
      service_type: input.service_type,
      price: input.price,
      notes: input.notes ?? null,
      photos: [],
    })
    .select()
    .single()

  if (error) throw error

  // Статистика клиента: берём текущие значения и инкрементим
  const { data: clientRow, error: fetchErr } = await supabase
    .from('clients')
    .select('total_visits, total_spent')
    .eq('id', input.client_id)
    .maybeSingle()

  if (fetchErr) throw fetchErr

  const today = new Date().toISOString().slice(0, 10)
  const { error: updErr } = await supabase
    .from('clients')
    .update({
      last_visit: today,
      total_visits: Number(clientRow?.total_visits ?? 0) + 1,
      total_spent: Number(clientRow?.total_spent ?? 0) + input.price,
    })
    .eq('id', input.client_id)

  if (updErr) throw updErr

  return mapProcedure(data)
}
