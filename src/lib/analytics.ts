/**
 * GAZE — реальная аналитика (ЭКРАН 5)
 *
 * Раньше экран «Аналитика» брал периоды (Неделя/Месяц/Квартал) из
 * demoAnalyticsPeriods (src/lib/dev-data.ts) — даже у реального мастера с
 * данными в Supabase. Здесь считается честная агрегация из процедур мастера:
 *   доход      = Σ price за период
 *   расходы    = Σ cost (материалы) за период
 *   клиенты    = уникальные посетители (client_id) за период
 *   средний чек= доход / число визитов
 *   повторные  = доля посетителей с ≥2 визитами за период
 *   тренды     = сравнение с предыдущим периодом (неделя/месяц/квартал назад)
 *   daily      = доход по дням (неделя — 7 дней; месяц/квартал — до 7 сегментов)
 *   topServices= топ-5 услуг по доходу с долей от дохода периода
 */
import type { Procedure } from './mock'
import type { AnalyticsPeriodData, DailyBar, TopService, Trend } from './dev-data'
import { procedureMasterIncome } from './salon'

type PeriodId = AnalyticsPeriodData['id']

interface PeriodDef {
  id: PeriodId
  label: string
  from: Date
  to: Date
  /** Начало предыдущего периода (для трендов) */
  prevFrom: Date
  prevTo: Date
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Границы периодов относительно «сегодня» (локальное время) */
function periodDefs(now: Date): PeriodDef[] {
  const today = startOfDay(now)
  const curYear = today.getFullYear()
  const curMonth = today.getMonth()

  // Неделя — последние 7 дней; предыдущая неделя — 7 дней до этого.
  const weekFrom = addDays(today, -6)
  const weekPrevFrom = addDays(weekFrom, -7)
  const weekPrevTo = addDays(weekFrom, -1)

  // Месяц — календарный месяц (с 1-го по сегодня); предыдущий — прошлый месяц.
  const monthFrom = new Date(curYear, curMonth, 1)
  const monthPrevFrom = new Date(curYear, curMonth - 1, 1)
  const monthPrevTo = new Date(curYear, curMonth, 0) // последний день прошлого месяца

  // Квартал — последние 90 дней; предыдущие 90 — до этого.
  const quarterFrom = addDays(today, -89)
  const quarterPrevFrom = addDays(quarterFrom, -90)
  const quarterPrevTo = addDays(quarterFrom, -1)

  return [
    {
      id: 'week',
      label: 'Неделя',
      from: weekFrom,
      to: today,
      prevFrom: weekPrevFrom,
      prevTo: weekPrevTo,
    },
    {
      id: 'month',
      label: 'Месяц',
      from: monthFrom,
      to: today,
      prevFrom: monthPrevFrom,
      prevTo: monthPrevTo,
    },
    {
      id: 'quarter',
      label: 'Квартал',
      from: quarterFrom,
      to: today,
      prevFrom: quarterPrevFrom,
      prevTo: quarterPrevTo,
    },
  ]
}

/** Процедуры с created_at в [from, to] включительно (по местному дню) */
function inRange(procedures: Procedure[], from: Date, to: Date): Procedure[] {
  const f = from.getTime()
  const t = to.getTime() + 86_400_000 - 1 // конец дня `to`
  return procedures.filter((p) => {
    const ts = new Date(p.created_at).getTime()
    return Number.isFinite(ts) && ts >= f && ts <= t
  })
}

interface Metrics {
  income: number
  cost: number
  profit: number
  clients: number
  avgCheck: number
  repeatRate: number
}

function metrics(procedures: Procedure[]): Metrics {
  let income = 0
  let cost = 0
  for (const p of procedures) {
    income += p.price ?? 0
    cost += p.cost ?? 0
  }
  const visits = procedures.length

  const clientCounts = new Map<string, number>()
  for (const p of procedures) {
    clientCounts.set(p.client_id, (clientCounts.get(p.client_id) ?? 0) + 1)
  }
  const clientCount = clientCounts.size
  const repeatVisitors = [...clientCounts.values()].filter((n) => n >= 2).length

  return {
    income,
    cost,
    profit: income - cost,
    clients: clientCount,
    avgCheck: visits > 0 ? Math.round(income / visits) : 0,
    repeatRate: clientCount > 0 ? Math.round((repeatVisitors / clientCount) * 100) : 0,
  }
}

/** Тренд: изменение % относительно предыдущего периода */
function trend(cur: number, prev: number): Trend {
  if (cur === 0 && prev === 0) return { dir: 'flat', delta: 0 }
  if (prev === 0) return { dir: cur > 0 ? 'up' : 'flat', delta: 0 }
  const raw = Math.round(((cur - prev) / prev) * 100)
  const delta = Math.min(Math.max(raw, -999), 999)
  return { dir: raw > 0 ? 'up' : raw < 0 ? 'down' : 'flat', delta }
}

/** Доход по дням: неделя — 7 дней (Пн..Вс), месяц/квартал — до 7 сегментов */
function dailyBars(id: PeriodId, procedures: Procedure[], from: Date, to: Date, today: Date): DailyBar[] {
  const incomeByDay = new Map<string, number>()
  for (const p of procedures) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    incomeByDay.set(key, (incomeByDay.get(key) ?? 0) + (p.price ?? 0))
  }
  const get = (d: Date): number =>
    incomeByDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? 0

  if (id === 'week') {
    const names = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const bars: DailyBar[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(from, i)
      bars.push({ label: names[d.getDay()], value: get(d), isToday: sameDay(d, today) })
    }
    return bars
  }

  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
  const buckets = Math.min(7, totalDays)
  const perBucket = Math.ceil(totalDays / buckets)
  const bars: DailyBar[] = []
  for (let i = 0; i < buckets; i++) {
    const bFrom = addDays(from, i * perBucket)
    const bTo = addDays(from, Math.min((i + 1) * perBucket - 1, totalDays - 1))
    let value = 0
    for (let d = bFrom; d <= bTo; d = addDays(d, 1)) value += get(d)
    const label =
      id === 'month'
        ? String(bFrom.getDate())
        : bFrom.toLocaleDateString('ru-RU', { month: 'short' })
    bars.push({ label, value, isToday: bFrom <= today && today <= bTo })
  }
  return bars
}

/** Топ услуг по доходу за период (до 5) с долей от дохода, % */
function topServices(procedures: Procedure[]): TopService[] {
  const byName = new Map<string, number>()
  let income = 0
  for (const p of procedures) {
    byName.set(p.service_type, (byName.get(p.service_type) ?? 0) + (p.price ?? 0))
    income += p.price ?? 0
  }
  return [...byName.entries()]
    .map(([name, sum]) => ({ name, sum, share: income > 0 ? Math.round((sum / income) * 100) : 0 }))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 5)
}

/**
 * T20 — доход мастера за период, посчитанный ПО КАЖДОЙ процедуре:
 * салонный клиент → чек × percent/100, свой клиент → весь чек.
 * У старых процедур без флага is_salon наследуется глобальный режим салона.
 */
export function masterIncomeFor(procedures: Procedure[], periodId: PeriodId): number {
  const def = periodDefs(new Date()).find((d) => d.id === periodId)
  if (!def) return 0
  return inRange(procedures, def.from, def.to).reduce(
    (sum, p) => sum + procedureMasterIncome(p),
    0,
  )
}

/**
 * Считает периоды аналитики из реальных процедур мастера.
 * Пустой список процедур → периоды с нулями (без падения).
 */
export function buildAnalyticsPeriods(procedures: Procedure[]): AnalyticsPeriodData[] {
  const now = new Date()
  const today = startOfDay(now)

  return periodDefs(now).map(({ id, label, from, to, prevFrom, prevTo }) => {
    const cur = inRange(procedures, from, to)
    const prev = inRange(procedures, prevFrom, prevTo)
    const m = metrics(cur)
    const pm = metrics(prev)
    return {
      id,
      label,
      income: m.income,
      cost: m.cost,
      profit: m.profit,
      clients: m.clients,
      avgCheck: m.avgCheck,
      repeatRate: m.repeatRate,
      trends: {
        income: trend(m.income, pm.income),
        clients: trend(m.clients, pm.clients),
        avgCheck: trend(m.avgCheck, pm.avgCheck),
        repeatRate: trend(m.repeatRate, pm.repeatRate),
        profit: trend(m.profit, pm.profit),
      },
      daily: dailyBars(id, cur, from, to, today),
      topServices: topServices(cur),
    }
  })
}
