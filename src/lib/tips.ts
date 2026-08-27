/**
 * T16 — ЧАЕВЫЕ ЧЕРЕЗ QR
 *
 * Демо-слой чаевых: статистика хранится в localStorage под ключом `gaze_tips`
 * (массив записей { amount, name, at }). На реальном этапе чаевые будут
 * проходить через платёжного провайдера, здесь — демо-имитация: страница
 * оплаты по QR «Отправить чаевые» просто добавляет запись в этот счётчик,
 * а аналитика показывает сумму за месяц.
 */

export interface TipRecord {
  /** Сумма чаевых, ₽ */
  amount: number
  /** Имя клиента (может быть пустым — клиент не заполнил) */
  name: string
  /** ISO-строка, когда отправлены */
  at: string
}

export interface TipsStats {
  /** Чаевые за текущий месяц, ₽ */
  monthSum: number
  /** Сколько чаевых за текущий месяц */
  monthCount: number
  /** Чаевые за всё время, ₽ */
  totalSum: number
  /** Все записи */
  records: TipRecord[]
}

const TIPS_KEY = 'gaze_tips'
const TIPS_SEEDED_KEY = 'gaze_tips_seeded'

/** ISO в текущем месяце (день 1–28) — чтобы «демо-чаевые» попадали в месяц */
function isoInCurrentMonth(day: number): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(Math.min(Math.max(day, 1), 28)).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}T${12 + (day % 8)}:00:00`
}

/** Демо-чаевые по умолчанию (+1 200 ₽ за месяц) — аналитика выглядит живой */
const SEED_TIPS: TipRecord[] = [
  { amount: 500, name: 'Марина Соколова', at: isoInCurrentMonth(3) },
  { amount: 200, name: 'Ольга Виноградова', at: isoInCurrentMonth(9) },
  { amount: 500, name: 'Алина Гусева', at: isoInCurrentMonth(14) },
]

function readAll(): TipRecord[] {
  try {
    const raw = localStorage.getItem(TIPS_KEY)
    if (raw) return JSON.parse(raw) as TipRecord[]
  } catch {
    /* localStorage недоступен — пустой список */
  }
  return []
}

/** При первом запуске наполняем демо-чаевыми, чтобы статистика была не пустой */
export function ensureTipsSeeded(): void {
  try {
    if (localStorage.getItem(TIPS_SEEDED_KEY)) return
    localStorage.setItem(TIPS_KEY, JSON.stringify(SEED_TIPS))
    localStorage.setItem(TIPS_SEEDED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function loadTips(): TipRecord[] {
  // ВАЖНО: не сидируем демо-чаевые (1200₽) — иначе аналитика врёт новому
  // пользователю. Только реальные записи.
  return readAll()
}

function inCurrentMonth(iso: string): boolean {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return iso.startsWith(prefix)
}

export function summarizeTips(records: TipRecord[]): TipsStats {
  const month = records.filter((r) => inCurrentMonth(r.at))
  return {
    monthSum: month.reduce((s, r) => s + r.amount, 0),
    monthCount: month.length,
    totalSum: records.reduce((s, r) => s + r.amount, 0),
    records,
  }
}

export function getTipsStats(): TipsStats {
  return summarizeTips(loadTips())
}

/** Записать новое чаевое (страница оплаты по QR — демо-имитация) */
export function addTip(amount: number, name: string): TipsStats {
  const all = [
    ...loadTips(),
    { amount, name: name.trim() || 'Клиент', at: new Date().toISOString() },
  ]
  try {
    localStorage.setItem(TIPS_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
  return summarizeTips(all)
}

/**
 * Демо-ссылка на оплату, которую кодирует QR-код.
 * На реальном этапе здесь будет ссылка платёжного провайдера.
 */
export function buildTipLink(masterId: string, clientId: string | null): string {
  const params = new URLSearchParams({ m: masterId })
  if (clientId) params.set('c', clientId)
  return `https://gaze.tips/pay?${params.toString()}`
}
