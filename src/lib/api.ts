/**
 * GAZE Platform — слой данных (ЭТАП 2)
 *
 * Все запросы идут по правилам RLS: клиенты/процедуры/бонусы — строго по
 * своему master_id; мастер определяется по telegram_id из Telegram WebApp.
 * Без Supabase Auth (этап 3) анонимные вставки/чтения под RLS будут падать —
 * ошибки переводятся в человекочитаемый вид (см. friendlyError).
 */
import type { Article, Client, Course, Master, Procedure } from './mock'
import {
  demoArticles,
  demoBonuses,
  demoClients,
  demoCourses,
  demoMaster,
  demoProcedures,
} from './dev-data'
import {
  isSupabaseReady,
  supabase,
  type ArticleRow,
  type BonusRow,
  type ClientRow,
  type CourseRow,
  type MasterRow,
  type ProcedureRow,
} from './supabase'
import { getTelegramUserName, hasTelegramInitData, resolveTelegramUserId } from './telegram'

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
  /** Себестоимость (расходы на материалы), ₽ — необязательно, по умолчанию 0 */
  cost?: number
  notes?: string
}

export interface NewClientInput {
  master_id: string
  name: string
  phone: string
  notes?: string
  /** T15 — Ссылка (Telegram/соцсеть), необязательно */
  link?: string
  /** T15 — Краткое описание клиента, необязательно */
  description?: string
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
    link: row.link ?? '',
    description: row.description ?? '',
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
    cost: Number(row.cost ?? 0),
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

/**
 * T10 — Курс академии из строки БД. Уроки пока приходят только из демо-данных
 * (таблицы lessons нет) — из БД курс отдаётся с пустым списком уроков.
 */
function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title ?? '',
    subtitle: row.subtitle ?? '',
    category: (row.category as Course['category']) ?? 'promotion',
    level: (row.level as Course['level']) ?? 'beginner',
    coverEmoji: row.cover_emoji ?? '🎓',
    accent: row.accent ?? '#8a6d9a',
    lessons: [],
    is_premium: row.is_premium ?? false,
    readers: row.readers ?? undefined,
    created_at: row.created_at ?? '',
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

  // Любая ошибка Supabase/PostgREST (у неё есть .code: 42501 RLS, PGRST301/401
  // invalid key, 406 PGRST116, 22P02, 42P10 …) — до этапа 3 (Auth) приложение
  // работает в демо-режиме, данные из БД недоступны.
  if (code.length > 0 || /row-level security|violates row-level|permission denied|duplicate key/i.test(message)) {
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
 * true, когда приложение работает на демо-данных.
 * Устанавливается при первом переходе в демо (браузер вне Telegram или
 * Supabase не настроен) и далее все чтения отдают данные из src/lib/dev-data.ts.
 */
let demoMode = false

/**
 * T7 — true, когда демо-данные РАЗРЕШЕНЫ (браузер вне Telegram / Supabase не
 * настроен). Для реальных Telegram-пользователей (вход через Supabase Auth)
 * демо-фолбэк НЕ применяется: любая ошибка RLS отдаётся как ошибка.
 */
let demoAllowed = false

/** Текущий режим: true — отдаём демо-данные */
export function isDemoMode(): boolean {
  return demoMode
}

/**
 * Ошибка доступа/RLS: ЛЮБАЯ ошибка Supabase/PostgREST (у неё есть .code) —
 * 42501 (RLS), 401/PGRST301 (invalid api key), 406 (PGRST116), 22P02 (uuid),
 * 42P10 (upsert без unique-constraint) и т.п. Плюс текстовые маркеры RLS.
 * До этапа 3 (Supabase Auth) любой сбой чтения/записи = переход в демо-режим.
 */
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
    code.length > 0 ||
    /row-level security|violates row-level|permission denied|duplicate key|fetch|network|Failed to fetch|ERR_/i.test(message)
  )
}

/**
 * T15 — Локально добавленные клиенты (демо-режим): персистятся в localStorage,
 * чтобы повторный визит находил их без создания дубля и они появлялись в списках.
 */
const ADDED_CLIENTS_KEY = 'gaze_demo_added_clients'

function readAddedClients(): Client[] {
  try {
    const raw = localStorage.getItem(ADDED_CLIENTS_KEY)
    return raw ? (JSON.parse(raw) as Client[]) : []
  } catch {
    return []
  }
}

function writeAddedClients(clients: Client[]): void {
  try {
    localStorage.setItem(ADDED_CLIENTS_KEY, JSON.stringify(clients))
  } catch {
    /* localStorage недоступен (приватный режим) — клиент живёт в памяти */
  }
}

/** Демо-дашборд: клиенты (вкл. добавленные в этой сессии) + процедуры с флагом isDemo */
function demoDashboard(): DashboardData {
  demoMode = true
  return {
    clients: [...readAddedClients(), ...demoClients],
    procedures: [...demoProcedures],
    isDemo: true,
  }
}

/* ------------------------------------------------------------------ */
/* Мастер: определение по telegram_id                                  */
/* ------------------------------------------------------------------ */

/** Dev-фолбэк вне Telegram (браузер): telegram_id из mock-данных этапа 1 */
const DEV_TELEGRAM_ID = 123456789
const DEV_NAME = 'Анна'

let cachedResolution: MasterResolution | null = null

/**
 * T7 — Гарантирует анонимный вход (Supabase Auth) и возвращает uid пользователя.
 * Сессия сохраняется (persistSession: true) — при переоткрытии мини-аппа
 * восстанавливается тот же анонимный пользователь, а значит тот же мастер.
 * auth.uid() = user_id мастера (персональный аккаунт, RLS отдаёт свои данные).
 */
async function ensureAnonymousUser(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession()
  const existing = sessionData.session?.user
  if (existing?.id) return existing.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  const uid = data.user?.id
  if (!uid) throw new Error('Не удалось войти: Supabase Auth не вернул пользователя.')
  return uid
}

/**
 * T7 — Персональный аккаунт мастера через Supabase Auth.
 *
 * 1) Вне Telegram (браузер/превью) или без настроек Supabase → ДЕМО-режим
 *    (dev-данные, как было на этапах 1-2). Auth не вызывается.
 * 2) Реальный Telegram-пользователь:
 *    signInAnonymously → auth.uid() = user_id мастера;
 *    ищем аккаунт по user_id=uid (быстрый путь) → если нет, вызываем
 *    resolve_master (найдёт по telegram_id и привяжет user_id, либо создаст
 *    новый аккаунт с trial-подпиской). Возвращаем СВОЙ аккаунт.
 *    В демо НЕ падаем — ошибка возвращается как есть.
 */
export async function resolveMaster(force = false): Promise<MasterResolution> {
  if (cachedResolution && !force) return cachedResolution

  // G4: telegram_id может прийти чуть позже старта WebView. Если Telegram
  // передал initData (query или hash), но user ещё не распарсен — ждём его
  // короткое время, прежде чем решать «вне Telegram → демо». Вне Telegram
  // (нет initData) resolveTelegramUserId возвращает null сразу, без задержек.
  const tgId = await resolveTelegramUserId({ waitIfPending: true })

  const isDev = tgId === null
  const telegramId = tgId ?? DEV_TELEGRAM_ID
  const tgName = getTelegramUserName()
  const name = tgName ?? (isDev ? DEV_NAME : 'Мастер GAZE')

  // Браузер вне Telegram ИЛИ Supabase не настроен.
  // Если Supabase готов и у пользователя УЖЕ есть сохранённая анонимная сессия
  // (открывал через WebApp ранее) — пытаемся найти его аккаунт по user_id,
  // а не кидаем в демо. Демо — только если аккаунта нет совсем.
  if (!isSupabaseReady) {
    demoMode = true
    demoAllowed = true
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
    // 1) Анонимный вход → auth.uid() = user_id мастера (персональный аккаунт)
    const uid = await ensureAnonymousUser()

    // 2) Уже привязанный аккаунт (быстрый путь по user_id)
    const { data: byUid, error: uidError } = await supabase
      .from('masters')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (uidError) throw uidError
    if (byUid) {
      cachedResolution = { master: mapMaster(byUid), telegramId, isDev, isDemo: false, error: null }
      return cachedResolution
    }

    // Вне Telegram (браузер, нет initData): аккаунта по сохранённой сессии нет →
    // демо (не создаём мусорного мастера с dev-телеграм id).
    if (isDev) {
      // G4: если Telegram ВСЁ ЖЕ передал initData (например, user отсутствует в
      // initData из-за ограничений приватности), но tgId не распарсился — это НЕ
      // демо-ситуация. Возвращаем ошибку, а не демо: мастер не должен потерять
      // свой аккаунт из-за молчаливого демо-фолбэка.
      if (hasTelegramInitData()) {
        return {
          master: null,
          telegramId,
          isDev,
          isDemo: false,
          error:
            'Не удалось получить данные аккаунта из Telegram. Закрой мини-апп и открой его снова через кнопку «Открыть GAZE Platform» в боте.',
        }
      }
      demoMode = true
      demoAllowed = true
      cachedResolution = {
        master: demoMaster,
        telegramId,
        isDev,
        isDemo: true,
        error: null,
      }
      return cachedResolution
    }

    // 3) resolve_master (SECURITY DEFINER, RLS не применяется): найдёт аккаунт
    //    по telegram_id и привяжет к user_id=uid (Костя уже есть в БД — его
    //    подписка active сохранится), либо создаст новый с trial-подпиской.
    const { data: row, error: rpcError } = await supabase.rpc('resolve_master', {
      p_telegram_id: telegramId,
      p_name: name,
    })
    if (rpcError) throw rpcError
    if (!row) throw new Error('resolve_master не вернул аккаунт мастера.')

    cachedResolution = { master: mapMaster(row), telegramId, isDev, isDemo: false, error: null }
    return cachedResolution
  } catch (err) {
    // Реальный Telegram-пользователь: аккаунт обязан быть СВОИМ — без демо.
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
    // Демо-фолбэк только для браузера вне Telegram (T7: реальным пользователям — ошибка)
    if (isAccessError(err) && demoAllowed) return demoDashboard()
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
    if (demoMode && clients.length === 0) return [...readAddedClients(), ...demoClients]
    return clients
  } catch (err) {
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return [...readAddedClients(), ...demoClients]
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
    if (!data && demoMode) {
      return readAddedClients().find((c) => c.id === clientId) ?? demoClients.find((c) => c.id === clientId) ?? null
    }
    return data ? mapClient(data) : null
  } catch (err) {
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return readAddedClients().find((c) => c.id === clientId) ?? demoClients.find((c) => c.id === clientId) ?? null
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
    if (isAccessError(err) && demoAllowed) {
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
    if (isAccessError(err) && demoAllowed) {
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
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return [...demoArticles]
    }
    throw err
  }
}

/**
 * T10 — Курсы академии. Таблицы courses в БД пока нет (этап 3) — любой сбой
 * чтения/RLS отдаёт демо-курсы с уроками, как и остальные данные.
 */
export async function fetchCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const courses = (data ?? []).map(mapCourse)
    if (demoMode && courses.length === 0) return [...demoCourses]
    return courses
  } catch (err) {
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return [...demoCourses]
    }
    throw err
  }
}

/* ------------------------------------------------------------------ */
/* Запись                                                              */
/* ------------------------------------------------------------------ */

/**
 * Синтетическая процедура для демо-режима (этап 3: запись в БД заменит фолбэк).
 * Параллель demoClientFromInput: в демо-режиме запись процедуры должна
 * «успевать» так же, как добавление клиента, иначе форма покажет ошибку RLS.
 */
function demoProcedureFromInput(input: NewProcedureInput): Procedure {
  const now = new Date()
  return {
    id: `demo-p-${now.getTime()}`,
    client_id: input.client_id,
    master_id: input.master_id,
    service_type: input.service_type,
    price: input.price,
    cost: input.cost ?? 0,
    notes: input.notes ?? '',
    photos: [],
    created_at: now.toISOString(),
  }
}

/**
 * Записывает процедуру и обновляет статистику клиента:
 * last_visit = сегодня, total_visits +1, total_spent + price.
 * В демо-режиме (RLS без auth, этап 3) вставка падает — вместо ошибки
 * возвращаем синтетическую процедуру, как и в addClient.
 */
export async function addProcedure(input: NewProcedureInput): Promise<Procedure> {
  if (!isSupabaseReady) {
    demoMode = true
    return demoProcedureFromInput(input)
  }
  try {
    const { data, error } = await supabase
      .from('procedures')
      .insert({
        client_id: input.client_id,
        master_id: input.master_id,
        service_type: input.service_type,
        price: input.price,
        cost: input.cost ?? 0,
        notes: input.notes ?? null,
        photos: [],
      })
      .select()
      .single()

    if (error) throw error
    return mapProcedure(data)
  } catch (err) {
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return demoProcedureFromInput(input)
    }
    throw err
  }
}

/** Синтетический клиент для демо-режима (этап 3: запись в БД заменит фолбэк) */
function demoClientFromInput(input: NewClientInput): Client {
  const now = new Date()
  const client: Client = {
    id: `demo-c-${now.getTime()}`,
    master_id: input.master_id,
    name: input.name,
    phone: input.phone ?? '',
    notes: input.notes ?? '',
    link: input.link ?? '',
    description: input.description ?? '',
    last_visit: now.toISOString().slice(0, 10),
    total_visits: 0,
    total_spent: 0,
    bonus_points: 0,
    created_at: now.toISOString(),
  }
  // T15 — сохраняем добавленного клиента в localStorage (повторный визит без дублей).
  // Страховка от дубля на уровне данных: не добавляем, если имя/телефон уже есть.
  const prev = readAddedClients()
  const already = prev.some(
    (c) =>
      c.name.trim().toLowerCase() === client.name.trim().toLowerCase() ||
      (client.phone !== '' && c.phone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')),
  )
  if (!already) writeAddedClients([client, ...prev])
  return client
}

/**
 * Добавляет клиента. В демо-режиме (RLS без auth, этап 3) вставка падает —
 * вместо ошибки показываем успех и возвращаем синтетического клиента,
 * чтобы форма работала без сбоев.
 */
export async function addClient(input: NewClientInput): Promise<Client> {
  if (!isSupabaseReady) {
    demoMode = true
    return demoClientFromInput(input)
  }
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        master_id: input.master_id,
        name: input.name,
        phone: input.phone ?? '',
        notes: input.notes ?? null,
        link: input.link ?? null,
        description: input.description ?? null,
        last_visit: new Date().toISOString().slice(0, 10),
        total_visits: 0,
        total_spent: 0,
        bonus_points: 0,
      })
      .select()
      .single()

    if (error) throw error
    return mapClient(data)
  } catch (err) {
    if (isAccessError(err) && demoAllowed) {
      demoMode = true
      return demoClientFromInput(input)
    }
    throw err
  }
}
