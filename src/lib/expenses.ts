/**
 * T17 — РАСХОДЫ МАСТЕРА (отдельная запись, а не только поле в процедуре)
 *
 * Раньше расход можно было забить ТОЛЬКО при записи процедуры (поле
 * «Расходы на материалы»). Здесь — полноценный учёт: купил материалы, оплатил
 * аренду/рекламу, закупил инструменты — это отдельная запись.
 *
 * Записи живут в localStorage под ключом `gaze_expenses` (массив
 * { id, category, amount, date, comment }). При первом запуске наполняем
 * демо-расходами, чтобы юнит-экономика выглядела живой.
 *
 * В юнит-экономике аналитики расходы учитываются так:
 *   расходы = расходы на материалы (из процедур) + отдельные расходы (gaze_expenses)
 *   прибыль  = доход − все расходы
 */

export type ExpenseCategory =
  | 'Материалы'
  | 'Материалы салона'
  | 'Аренда'
  | 'Реклама'
  | 'Инструменты'
  | 'Другое'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Материалы',
  'Материалы салона',
  'Аренда',
  'Реклама',
  'Инструменты',
  'Другое',
]

export interface ExpenseRecord {
  id: string
  category: ExpenseCategory
  /** Сумма расхода, ₽ */
  amount: number
  /** Дата расхода, YYYY-MM-DD */
  date: string
  /** Комментарий (необязательно) */
  comment: string
}

const EXPENSES_KEY = 'gaze_expenses'
const EXPENSES_SEEDED_KEY = 'gaze_expenses_seeded'

/** Дата YYYY-MM-DD в текущем месяце (день 1–28, безопасно для UTC) */
function dateInCurrentMonth(day: number): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(Math.min(Math.max(day, 1), 28)).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/** Демо-расходы за месяц: аренда 12 000 + материалы 8 000 + реклама 5 000 = 25 000 ₽ */
const SEED_EXPENSES: ExpenseRecord[] = [
  { id: 'demo-e-1', category: 'Аренда', amount: 12000, date: dateInCurrentMonth(1), comment: 'Аренда студии за месяц' },
  { id: 'demo-e-2', category: 'Материалы', amount: 8000, date: dateInCurrentMonth(5), comment: 'Краски, сыворотки, расходники' },
  { id: 'demo-e-3', category: 'Реклама', amount: 5000, date: dateInCurrentMonth(9), comment: 'Авито + Telegram-канал' },
]

function readAll(): ExpenseRecord[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY)
    if (raw) return JSON.parse(raw) as ExpenseRecord[]
  } catch {
    /* localStorage недоступен — пустой список */
  }
  return []
}

/** При первом запуске наполняем демо-расходами, чтобы экран и юнит-экономика были живыми */
export function ensureExpensesSeeded(): void {
  try {
    if (localStorage.getItem(EXPENSES_SEEDED_KEY)) return
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(SEED_EXPENSES))
    localStorage.setItem(EXPENSES_SEEDED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function loadExpenses(): ExpenseRecord[] {
  // ВАЖНО: не сидируем демо-расходы — иначе «прочие расходы» 25к попадают
  // в аналитику как реальные и отпугивают пользователя. Только реальные записи.
  return readAll()
}

/** Дата YYYY-MM-DD сегодня (локальное время) */
export function todayISO(): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

function uid(): string {
  return `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Добавить расход (ЭКРАН «Расходы») → возвращает обновлённый список */
export function addExpense(
  category: ExpenseCategory,
  amount: number,
  date: string,
  comment: string,
): ExpenseRecord[] {
  const all = [
    ...loadExpenses(),
    { id: uid(), category, amount, date, comment: comment.trim() },
  ]
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all
}

/** Удалить расход по id → возвращает обновлённый список */
export function removeExpense(id: string): ExpenseRecord[] {
  const all = loadExpenses().filter((e) => e.id !== id)
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return all
}

/** Сумма расходов за календарный месяц (YYYY-MM) */
function inCalendarMonth(records: ExpenseRecord[], ym: string): ExpenseRecord[] {
  return records.filter((e) => e.date.slice(0, 7) === ym)
}

/** Итог за текущий календарный месяц, ₽ */
export function monthExpensesTotal(records: ExpenseRecord[]): number {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return inCalendarMonth(records, ym).reduce((sum, e) => sum + e.amount, 0)
}

/** Отдельные расходы за текущий месяц (для юнит-экономики дашборда) */
export function monthOtherExpenses(): number {
  return monthExpensesTotal(loadExpenses())
}

/**
 * T19 — расходы, реально вычитаемые из дохода мастера.
 * В режиме салона «Материалы салона» оплачивает салон → не вычитаются.
 */
export function masterExpenses(records: ExpenseRecord[]): number {
  return records
    .filter((e) => !(e.category === 'Материалы салона'))
    .reduce((sum, e) => sum + e.amount, 0)
}

/** Сумма расходов за последние N дней (для неделя/квартал в аналитике) */
export function expensesSince(records: ExpenseRecord[], days: number): number {
  const from = new Date()
  from.setDate(from.getDate() - days)
  const fromISO = from.toISOString().slice(0, 10)
  return records
    .filter((e) => e.date >= fromISO && e.date <= todayISO())
    .reduce((sum, e) => sum + e.amount, 0)
}

/** Итоги по категориям (для экрана «Расходы») */
export function summarizeExpenses(records: ExpenseRecord[]): Record<ExpenseCategory, number> {
  const init = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>
  return records.reduce((acc, e) => {
    acc[e.category] += e.amount
    return acc
  }, init)
}
