/**
 * G1b — GAZE PATH: система уровней роста мастера (техническая часть).
 *
 * 6 уровней: База → Возврат → Цена → Поток → Автоматизация → Масштаб.
 * Система САМА передвигает мастера с уровня на уровень по РЕАЛЬНЫМ метрикам
 * платформы: клиенты, возвраты, средний чек, новые клиенты, рефералы,
 * напоминания, чаевые и доход. Никакого ручного переключения — только данные.
 *
 * Состояние хранится в localStorage под ключом `gaze_level`:
 *   { level, startedAt, checkpoints: {clients, returns, avgCheck, newClients,
 *     referral, reminders, tips, income2m}, completedAt, avgCheckAtEntry, income2mMonths }
 *
 * Контент (уроки) зальют отдельно — здесь только механика.
 */
import type { Client, Procedure } from './mock'
import { fetchDashboard, friendlyError, isDemoMode } from './api'
import { demoReferral, demoReminders } from './dev-data'
import { listSentClientIds } from './reminders'
import { getTipsStats } from './tips'

/* ------------------------------------------------------------------ */
/* Константы системы                                                    */
/* ------------------------------------------------------------------ */

export const MAX_PATH_LEVEL = 6

/** Скип при первом запуске: доход уже > 100к → сразу уровень 2 (или 3, если > 120к) */
export const SKIP_LEVEL2_INCOME = 100_000
export const SKIP_LEVEL3_INCOME = 120_000

/** Пороги чекпоинтов */
export const CHECKPOINT_CLIENTS = 20
export const CHECKPOINT_RETURNS = 5
export const CHECKPOINT_AVG_CHECK_GROWTH = 1.3 // средний чек +30%
export const CHECKPOINT_NEW_CLIENTS = 5
export const CHECKPOINT_REFERRALS = 1
export const CHECKPOINT_REMINDERS = 5
export const CHECKPOINT_TIPS = 3
export const INCOME_2M_THRESHOLD = 200_000

const PATH_KEY = 'gaze_level'
const REFERRALS_KEY = 'gaze_referrals'

/* ------------------------------------------------------------------ */
/* Модель                                                               */
/* ------------------------------------------------------------------ */

/** Чекпоинты уровней. Для текущего уровня «живые», для остальных — false. */
export interface PathCheckpoints {
  /** Уровень 1: 20+ клиентов в базе */
  clients: boolean
  /** Уровень 2: 5+ возвратов за месяц */
  returns: boolean
  /** Уровень 3: средний чек +30% (от снимка на входе в уровень) */
  avgCheck: boolean
  /** Уровень 4: 5+ новых клиентов за месяц */
  newClients: boolean
  /** Уровень 4: 1+ реферал */
  referral: boolean
  /** Уровень 5: напоминания настроены */
  reminders: boolean
  /** Уровень 5: 3+ чаевых через QR */
  tips: boolean
  /** Уровень 6: доход 200к+ 2 месяца подряд */
  income2m: boolean
}

export interface PathState {
  /** Текущий уровень мастера (1–6) */
  level: number
  /** Когда мастер начал путь (первый запуск платформы) */
  startedAt: string
  /** Выполнение чекпоинтов ТЕКУЩЕГО уровня */
  checkpoints: PathCheckpoints
  /** Когда произошёл последний автопереход (null — переходов ещё не было) */
  completedAt: string | null
  /** Снимок среднего чека на входе в уровень 3 «Цена» (для чекпоинта +30%) */
  avgCheckAtEntry?: number
  /** Месяцы (YYYY-MM), когда доход был ≥ 200к (чекпоинт уровня 6) */
  income2mMonths: string[]
}

/** Живые метрики платформы — из чего считаются чекпоинты */
export interface PathMetrics {
  clientsCount: number
  /** Возвраты за месяц: клиентки с визитом в текущем месяце, у кого был предыдущий визит */
  returnsThisMonth: number
  /** Средний чек по всем процедурам */
  avgCheck: number
  /** Новые клиентки за текущий месяц (created_at) */
  newClientsThisMonth: number
  /** Рефералы (счётчик из localStorage, наполняет платформа) */
  referralCount: number
  /** Отправленные напоминания + демо-напоминания (в демо) */
  remindersCount: number
  /** Чаевые через QR за текущий месяц */
  tipsCount: number
  /** Доход за текущий месяц */
  incomeMonth: number
}

/** Чекпоинт с метаданными для UI (галочка/кружок, подпись, подсказка) */
export interface PathCheckpointMeta {
  id: keyof PathCheckpoints
  label: string
  hint: string
  done: boolean
}

/** Описание уровня (для карты «Путь») */
export interface PathLevel {
  level: number
  name: string
  emoji: string
  goalMin: number
  goalMax: number | null
  goalLabel: string
  description: string
  checkpoints: Array<Omit<PathCheckpointMeta, 'done'>>
}

/** Результат пересчёта прогресса */
export interface PathEvaluation {
  state: PathState
  metrics: PathMetrics
  /** Чекпоинты текущего уровня с метаданными (для UI) */
  checkpointList: PathCheckpointMeta[]
  /** true — произошёл автопереход уровня */
  advanced: boolean
  /** С какого уровня начали пересчёт */
  fromLevel: number
  /** На каком уровне оказались */
  toLevel: number
  /** true — данные не удалось получить (прогресс не перезаписан) */
  error?: boolean
  /** Человекочитаемое описание ошибки (для UI), когда error === true */
  errorMessage?: string
}

/* ------------------------------------------------------------------ */
/* Уровни                                                               */
/* ------------------------------------------------------------------ */

export const PATH_LEVELS: PathLevel[] = [
  {
    level: 1,
    name: 'База',
    emoji: '🌱',
    goalMin: 80_000,
    goalMax: 100_000,
    goalLabel: '80–100к',
    description: 'Собери базу клиенток и доведи доход до 80–100к. Входной уровень — сюда попадают все мастера, даже те, кто пока зарабатывает 40–60к.',
    checkpoints: [{ id: 'clients', label: '20+ клиентов в базе', hint: 'добавляй клиенток после каждого визита' }],
  },
  {
    level: 2,
    name: 'Возврат',
    emoji: '🔁',
    goalMin: 100_000,
    goalMax: 120_000,
    goalLabel: '100–120к',
    description: 'Научись возвращать клиенток: напоминания и система повторных визитов. Если при старте ты уже зарабатываешь больше 100к — система сразу начинает с этого уровня.',
    checkpoints: [{ id: 'returns', label: '5+ возвратов за месяц', hint: 'клиентки, которые вернулись на повторный визит' }],
  },
  {
    level: 3,
    name: 'Цена',
    emoji: '💎',
    goalMin: 120_000,
    goalMax: 150_000,
    goalLabel: '120–150к',
    description: 'Подними средний чек на 30%: комплексы, доп-услуги, ценность визита.',
    checkpoints: [{ id: 'avgCheck', label: 'Средний чек +30%', hint: 'от значения на входе в уровень' }],
  },
  {
    level: 4,
    name: 'Поток',
    emoji: '🌊',
    goalMin: 150_000,
    goalMax: 180_000,
    goalLabel: '150–180к',
    description: 'Собери постоянный поток: новые клиентки и сарафан.',
    checkpoints: [
      { id: 'newClients', label: '5+ новых клиентов', hint: 'за текущий месяц' },
      { id: 'referral', label: '1+ реферал', hint: 'клиентка пришла по рекомендации' },
    ],
  },
  {
    level: 5,
    name: 'Автоматизация',
    emoji: '⚙️',
    goalMin: 180_000,
    goalMax: 200_000,
    goalLabel: '180–200к',
    description: 'Пусть платформа работает за тебя: напоминания и чаевые через QR.',
    checkpoints: [
      { id: 'reminders', label: 'Настроены напоминания', hint: 'отправляй напоминания клиенткам' },
      { id: 'tips', label: '3+ чаевых через QR', hint: 'за текущий месяц' },
    ],
  },
  {
    level: 6,
    name: 'Масштаб',
    emoji: '🚀',
    goalMin: 200_000,
    goalMax: null,
    goalLabel: '200к+',
    description: 'Финальный уровень: стабильный доход 200к+ два месяца подряд.',
    checkpoints: [{ id: 'income2m', label: 'Доход 200к+ 2 месяца подряд', hint: 'стабильность — признак мастера' }],
  },
]

/** Уровень по номеру (1–6). Всегда возвращает валидный уровень. */
export function getPathLevel(level: number): PathLevel {
  const i = Math.min(Math.max(level, 1), MAX_PATH_LEVEL) - 1
  return PATH_LEVELS[i]
}

/* ------------------------------------------------------------------ */
/* Хелперы дат                                                          */
/* ------------------------------------------------------------------ */

/** «2026-08» — текущий месяц */
function currentYM(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** «2026-08» из ISO-строки */
function isoMonth(iso: string): string {
  return (iso ?? '').slice(0, 7)
}

/** YYYY-MM → номер месяца с начала эпохи (для проверки «подряд») */
function parseMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return Number.NaN
  return y * 12 + m
}

/** Есть ли два КАЛЕНДАРНЫХ месяца подряд (для чекпоинта уровня 6) */
export function hasTwoConsecutiveMonths(months: string[]): boolean {
  const sorted = [...new Set(months.filter(Boolean))].sort()
  for (let i = 1; i < sorted.length; i++) {
    if (parseMonth(sorted[i]) - parseMonth(sorted[i - 1]) === 1) return true
  }
  return false
}

/* ------------------------------------------------------------------ */
/* localStorage: состояние пути + рефералы                              */
/* ------------------------------------------------------------------ */

function emptyCheckpoints(): PathCheckpoints {
  return {
    clients: false,
    returns: false,
    avgCheck: false,
    newClients: false,
    referral: false,
    reminders: false,
    tips: false,
    income2m: false,
  }
}

export function loadPathState(): PathState | null {
  try {
    const raw = localStorage.getItem(PATH_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<PathState>
    if (!s || typeof s.level !== 'number') return null
    return {
      level: s.level,
      startedAt: s.startedAt ?? new Date().toISOString(),
      checkpoints: { ...emptyCheckpoints(), ...(s.checkpoints ?? {}) },
      completedAt: s.completedAt ?? null,
      avgCheckAtEntry: typeof s.avgCheckAtEntry === 'number' ? s.avgCheckAtEntry : undefined,
      income2mMonths: s.income2mMonths ?? [],
    }
  } catch {
    return null
  }
}

export function savePathState(state: PathState): void {
  try {
    localStorage.setItem(PATH_KEY, JSON.stringify(state))
  } catch {
    /* localStorage недоступен (приватный режим) — состояние живёт в памяти */
  }
}

/** Дефолтное состояние (уровень 1, не сохраняется) — когда мастера ещё нет */
function defaultState(): PathState {
  return {
    level: 1,
    startedAt: new Date().toISOString(),
    checkpoints: emptyCheckpoints(),
    completedAt: null,
    income2mMonths: [],
  }
}

/** Текущий уровень мастера (путь ещё не начат → уровень 1) */
export function getCurrentLevel(): number {
  return loadPathState()?.level ?? 1
}

/** Рефералы: счётчик из localStorage. Платформа наполняет через registerReferral(). */
export function getReferralCount(): number {
  try {
    return Number(localStorage.getItem(REFERRALS_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

/** Вызывается платформой, когда клиентка пришла по реферальному коду мастера */
export function registerReferral(): void {
  try {
    localStorage.setItem(REFERRALS_KEY, String(getReferralCount() + 1))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Метрики из данных платформы                                          */
/* ------------------------------------------------------------------ */

function computeIncomeMonth(procedures: Procedure[]): number {
  const ym = currentYM()
  return procedures
    .filter((p) => isoMonth(p.created_at) === ym)
    .reduce((sum, p) => sum + p.price, 0)
}

function computeAvgCheck(procedures: Procedure[]): number {
  if (procedures.length === 0) return 0
  return Math.round(procedures.reduce((sum, p) => sum + p.price, 0) / procedures.length)
}

/** Собирает реальные метрики из данных (клиенты + процедуры) и счётчиков платформы */
export function computeMetrics(clients: Client[], procedures: Procedure[], isDemo: boolean): PathMetrics {
  const ym = currentYM()
  const incomeMonth = computeIncomeMonth(procedures)
  const avgCheck = computeAvgCheck(procedures)

  // Возврат за месяц: клиентка была в текущем месяце И у неё есть предыдущие визиты
  const returnsThisMonth = clients.filter((c) => isoMonth(c.last_visit) === ym && c.total_visits >= 2).length
  // Новые клиентки за месяц: созданы в текущем месяце
  const newClientsThisMonth = clients.filter((c) => isoMonth(c.created_at) === ym).length

  // Напоминания: реально отправленные из дашборда + демо-напоминания (в демо-режиме)
  const remindersCount = listSentClientIds().length + (isDemo ? demoReminders.length : 0)

  return {
    clientsCount: clients.length,
    returnsThisMonth,
    avgCheck,
    newClientsThisMonth,
    referralCount: getReferralCount() + (isDemo ? demoReferral.invited : 0),
    remindersCount,
    tipsCount: getTipsStats().monthCount,
    incomeMonth,
  }
}

function emptyMetrics(): PathMetrics {
  return {
    clientsCount: 0,
    returnsThisMonth: 0,
    avgCheck: 0,
    newClientsThisMonth: 0,
    referralCount: 0,
    remindersCount: 0,
    tipsCount: 0,
    incomeMonth: 0,
  }
}

/* ------------------------------------------------------------------ */
/* Чекпоинты и автопереход                                              */
/* ------------------------------------------------------------------ */

/** Выполнение чекпоинтов указанного уровня по живым метрикам */
function checkpointsForLevel(level: number, state: PathState, m: PathMetrics): PathCheckpoints {
  const base = emptyCheckpoints()
  switch (level) {
    case 1:
      return { ...base, clients: m.clientsCount >= CHECKPOINT_CLIENTS }
    case 2:
      return { ...base, returns: m.returnsThisMonth >= CHECKPOINT_RETURNS }
    case 3: {
      // Базой для «+30%» служит средний чек на входе в уровень (снимок)
      const baseAvg = state.avgCheckAtEntry && state.avgCheckAtEntry > 0 ? state.avgCheckAtEntry : m.avgCheck
      return {
        ...base,
        avgCheck: m.avgCheck > 0 && m.avgCheck >= Math.ceil(baseAvg * CHECKPOINT_AVG_CHECK_GROWTH),
      }
    }
    case 4:
      return {
        ...base,
        newClients: m.newClientsThisMonth >= CHECKPOINT_NEW_CLIENTS,
        referral: m.referralCount >= CHECKPOINT_REFERRALS,
      }
    case 5:
      return {
        ...base,
        reminders: m.remindersCount >= CHECKPOINT_REMINDERS,
        tips: m.tipsCount >= CHECKPOINT_TIPS,
      }
    case 6:
      return { ...base, income2m: hasTwoConsecutiveMonths(state.income2mMonths ?? []) }
    default:
      return base
  }
}

function allDoneFor(level: number, cp: PathCheckpoints): boolean {
  return PATH_LEVELS[level - 1].checkpoints.every((c) => cp[c.id])
}

function checkpointListFor(state: PathState): PathCheckpointMeta[] {
  return PATH_LEVELS[state.level - 1].checkpoints.map((c) => ({
    ...c,
    done: state.checkpoints[c.id] ?? false,
  }))
}

/**
 * Пересчёт чекпоинтов и автопереход. Сохраняет результат в localStorage.
 *
 * Правило перехода: система сама передвигает мастера на следующий уровень,
 * когда ВСЕ чекпоинты текущего уровня выполнены И доход достиг цели уровня.
 * Доход — такой же живой критерий, как и чекпоинты: без него на уровень не
 * перейти, даже если формальные чекпоинты закрыты.
 */
export function evaluatePath(prev: PathState, metrics: PathMetrics): PathEvaluation {
  // 1) Накопление месяцев с доходом ≥ 200к (для чекпоинта уровня 6)
  const income2m = new Set(prev.income2mMonths ?? [])
  if (metrics.incomeMonth >= INCOME_2M_THRESHOLD) income2m.add(currentYM())
  const income2mMonths = [...income2m].sort().slice(-12)

  let state: PathState = { ...prev, income2mMonths }

  // 2) Снимок среднего чека при входе в уровень 3 «Цена» (если ещё нет)
  if (state.level === 3 && (!state.avgCheckAtEntry || state.avgCheckAtEntry <= 0)) {
    state = { ...state, avgCheckAtEntry: metrics.avgCheck }
  }

  const fromLevel = state.level
  let level = state.level
  let advanced = false

  // 3) Автопереход: пока уровень полностью пройден и доход достиг цели — вперёд
  while (level < MAX_PATH_LEVEL) {
    const cp = checkpointsForLevel(level, state, metrics)
    const incomeOk = metrics.incomeMonth >= (PATH_LEVELS[level - 1].goalMin ?? 0)
    if (!allDoneFor(level, cp) || !incomeOk) break

    level += 1
    advanced = true

    // Снимок среднего чека при ВХОДЕ на уровень 3
    if (level === 3 && (!state.avgCheckAtEntry || state.avgCheckAtEntry <= 0)) {
      state = { ...state, avgCheckAtEntry: metrics.avgCheck }
    }
  }

  const checkpoints = checkpointsForLevel(level, state, metrics)
  const next: PathState = {
    ...state,
    level,
    checkpoints,
    completedAt: advanced ? new Date().toISOString() : state.completedAt,
  }
  savePathState(next)

  return {
    state: next,
    metrics,
    checkpointList: checkpointListFor(next),
    advanced,
    fromLevel,
    toLevel: level,
  }
}

/* ------------------------------------------------------------------ */
/* Старт и скип-логика                                                  */
/* ------------------------------------------------------------------ */

/** Стартовый уровень по доходу: >120к → 3, >100к → 2, иначе 1 */
export function startingLevelByIncome(incomeMonth: number): number {
  if (incomeMonth > SKIP_LEVEL3_INCOME) return 3
  if (incomeMonth > SKIP_LEVEL2_INCOME) return 2
  return 1
}

/**
 * Начать путь при ПЕРВОМ запуске (скип-логика): мастер, который уже
 * зарабатывает больше входного порога, стартует сразу с уровня 2 (или 3).
 * Ничего не делает, если путь уже начат.
 */
export function startPathIfNeeded(incomeMonth: number, avgCheck: number): PathState | null {
  const existing = loadPathState()
  if (existing) return null
  const level = startingLevelByIncome(incomeMonth)
  const state: PathState = {
    level,
    startedAt: new Date().toISOString(),
    checkpoints: emptyCheckpoints(),
    completedAt: null,
    avgCheckAtEntry: level === 3 ? avgCheck : undefined,
    income2mMonths: [],
  }
  savePathState(state)
  return state
}

/**
 * Пересчёт прогресса по данным, которые УЖЕ загружены в UI (без сети).
 * Используется виджетом на дашборде — не блокирует остальное приложение.
 */
export function syncPathProgress(
  masterId: string,
  clients: Client[],
  procedures: Procedure[],
  isDemo: boolean,
): PathEvaluation {
  const metrics = computeMetrics(clients, procedures, isDemo)
  let prev = loadPathState()
  if (!prev) {
    prev = masterId ? startPathIfNeeded(metrics.incomeMonth, metrics.avgCheck) : null
    prev = prev ?? defaultState()
  }
  return evaluatePath(prev, metrics)
}

/**
 * Полный пересчёт по ЖИВЫМ данным платформы (сеть).
 * Вызывается при открытии экрана «Путь» и по кнопке «Обновить прогресс».
 * При сбое сети прогресс НЕ перезаписывается — возвращается текущее состояние.
 */
export async function checkLevelProgress(masterId: string): Promise<PathEvaluation> {
  let clients: Client[] = []
  let procedures: Procedure[] = []
  let isDemo = isDemoMode()
  let ok = false
  let fetchError: string | null = null
  try {
    const dash = await fetchDashboard(masterId)
    clients = dash.clients ?? []
    procedures = dash.procedures ?? []
    isDemo = dash.isDemo ?? isDemo
    ok = true
  } catch (err) {
    /* сеть/RLS упали — не трогаем сохранённый прогресс, но сохраняем
       человекочитаемую причину для экрана (Path показывает её с повтором) */
    fetchError = friendlyError(err)
  }

  if (ok) return syncPathProgress(masterId, clients, procedures, isDemo)

  const prev = loadPathState() ?? defaultState()
  return {
    state: prev,
    metrics: emptyMetrics(),
    checkpointList: checkpointListFor(prev),
    advanced: false,
    fromLevel: prev.level,
    toLevel: prev.level,
    error: true,
    errorMessage: fetchError ?? 'Не удалось получить данные. Проверь интернет и попробуй ещё раз.',
  }
}
