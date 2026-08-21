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
  demoArticles,
  demoBonuses,
  demoClients,
  demoMaster,
  demoProcedures,
} from './dev-data'
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
  /** true, когда вернулись демо-данные (dev-фолбэк вместо RLS) */
  isDemo?: boolean
}

export interface ClientProfileData {
  client: Client | null
  history: Procedure[]
  bonuses: Bonus[]
  /** true, когда вернулись демо-данные (dev-фолбэк вместо RLS) */
  isDemo?: boolean
}

export interface MasterResolution {
  master: Master | null
  telegramId: number | null
  /** true, если работаем вне Telegram (dev-режим: браузер) */
  isDev: boolean
  /** true, когда мастер определён из демо-данных (RLS без auth, этап 3) */
  isDemo: boolean
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
  // PostgrestError — обычный объект { message, code, details, hint }, НЕ instanceof Error,
  // поэтому String(err) даёт "[object Object]". Достаём .message и .code явно.
  const isObj = typeof err === 'object' && err !== null
  const raw = err instanceof Error ? err.message : isObj && 'message' in err ? String((err as { message: unknown }).message) : ''
  const code = isObj && 'code' in err ? String((err as { code: unknown }).code) : ''
  const message = raw || String(err)

  // 42501 = insufficient_privilege (RLS без auth, этап 3)
  if (code === '42501' || /row-level security|violates row-level|permission denied|duplicate key/i.test(message)) {
    return 'Нет доступа к данным (RLS). Вход через Supabase Auth подключим на этапе 3 — сейчас данные читаются только под своим master_id.'
  }
  if (/fetch|network|Failed to fetch|ERR_/i.test(message)) {
    return 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.'
  }
  return message
}

/* ------------------------------------------------------------------ */
/* Демо-режим (dev-фолбэк, до этапа 3: Supabase Auth)                   */
/* ------------------------------------------------------------------ */

/**
 * true, когда приложение работает на демо-данных (RLS без auth).
 * Устанавливается при первом падении с ошибкой доступа и далее все
 * чтения отдают данные из src/lib/dev-data.ts.
 */
let demoMode = false

/** Текущий режим: true — отдаём демо-данные */
export function isDemoMode(): boolean {
  return demoMode
}

/** Ошибка доступа/RLS: 42501 (insufficient_privilege) или текст политики */
function isAccessError(err: unknown): boolean {
  const isObj = typeof err === 'object' && err !== null
  const code = isObj && 'code' in err ? String((err as { code: unknown }).code) : ''
  const message =
    err instanceof Error
      ? err.message
      : isObj && 'message' in err
        ? String((err as { message: unknown }).message)
        : ''
  return (
    code === '42501' ||
    code === '403' ||
    /row-level security|violates row-level|permission denied|duplicate key/i.test(message)
  )
}

/** Демо-дашборд: клиенты + процедуры с флагом isDemo */
function demoDashboard(): DashboardData {
  demoMode = true
  return { clients: [...demoClients], procedures: [...demoProcedures], isDemo: true }
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
 * При RLS без auth (этап 3: Supabase Auth) вставка падает — вместо ошибки
 * возвращаем ДЕМО-мастера (dev-фолбэк), чтобы мини-апп оставался рабочим.
 */
export async function resolveMaster(force = false): Promise<MasterResolution> {
  if (cachedResolution && !force) return cachedResolution

  const tgId = getTelegramUserId()
  const isDev = tgId === null
  const telegramId = tgId ?? DEV_TELEGRAM_ID
  const tgName = getTelegramUserName()
  const name = tgName ?? (isDev ? DEV_NAME : 'Мастер GAZE')

  if (!isSupabaseReady) {
    // Supabase не настроен — сразу демо-данные (dev-фолбэк)
    demoMode = true
    cachedResolution = {
      master: demoMaster,
      telegramId,
      isDev,
      isDemo: true,
      error: null,
    }
    return cachedResolution
  }

  try {
    const { data, error } = await supabase
      .from('masters')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle()

    if (error) throw error

    if (data) {
      cachedResolution = { master: mapMaster(data), telegramId, isDev, isDemo: false, error: null }
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
      return { master: null, telegramId, isDev, isDemo: false, error: 'Не удалось создать запись мастера.' }
    }

    cachedResolution = { master: mapMaster(inserted), telegramId, isDev, isDemo: false, error: null }
    return cachedResolution
  } catch (err) {
    // RLS без Supabase Auth блокирует чтение/upsert анониму — ожидаемо на этапе 2.
    // Вместо ошибки отдаём демо-мастера (временное решение до этапа 3).
    if (isAccessError(err)) {
      demoMode = true
      cachedResolution = {
        master: demoMaster,
        telegramId,
        isDev,
        isDemo: true,
        error: null,
      }
      return cachedResolution
    }
    return { master: null, telegramId, isDev, isDemo: false, error: friendlyError(err) }
  }
}

/* ------------------------------------------------------------------ */
/* Чтение данных                                                       */
/* ------------------------------------------------------------------ */

export async function fetchDashboard(masterId: string): Promise<DashboardData> {
  try {
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

    const clients = (clientsRes.data ?? []).map(mapClient)
    const procedures = (proceduresRes.data ?? []).map(mapProcedure)

    // Уже в демо-режиме, а данных нет — наполняем демо-данными
    if (demoMode && clients.length === 0 && procedures.length === 0) return demoDashboard()

    return { clients, procedures }
  } catch (err) {
    // RLS без auth (этап 2) — dev-фолбэк на демо-данные
    if (isAccessError(err)) return demoDashboard()
    throw err
  }
}

export async function fetchClients(masterId: string): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('master_id', masterId)
      .order('last_visit', { ascending: false })

    if (error) throw error

    const clients = (data ?? []).map(mapClient)
    if (demoMode && clients.length === 0) return [...demoClients]
    return clients
  } catch (err) {
    if (isAccessError(err)) {
      demoMode = true
      return [...demoClients]
    }
    throw err
  }
}

export async function fetchClient(clientId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (error) throw error

    // RLS без auth вернула пусто (200, отфильтровано auth.uid()=null) — ищем в демо
    if (!data && demoMode) return demoClients.find((c) => c.id === clientId) ?? null
    return data ? mapClient(data) : null
  } catch (err) {
    if (isAccessError(err)) {
      demoMode = true
      return demoClients.find((c) => c.id === clientId) ?? null
    }
    throw err
  }
}

export async function fetchClientProcedures(clientId: string): Promise<Procedure[]> {
  try {
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const procedures = (data ?? []).map(mapProcedure)
    if (demoMode && procedures.length === 0) {
      return demoProcedures.filter((p) => p.client_id === clientId)
    }
    return procedures
  } catch (err) {
    if (isAccessError(err)) {
      demoMode = true
      return demoProcedures.filter((p) => p.client_id === clientId)
    }
    throw err
  }
}

export async function fetchBonuses(masterId: string): Promise<Bonus[]> {
  try {
    const { data, error } = await supabase
      .from('bonuses')
      .select('*')
      .eq('master_id', masterId)

    if (error) throw error

    const bonuses = (data ?? []).map(mapBonus)
    if (demoMode && bonuses.length === 0) return [...demoBonuses]
    return bonuses
  } catch (err) {
    if (isAccessError(err)) {
      demoMode = true
      return [...demoBonuses]
    }
    throw err
  }
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
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const articles = (data ?? []).map(mapArticle)
    if (demoMode && articles.length === 0) return [...demoArticles]
    return articles
  } catch (err) {
    if (isAccessError(err)) {
      demoMode = true
      return [...demoArticles]
    }
    throw err
  }
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
