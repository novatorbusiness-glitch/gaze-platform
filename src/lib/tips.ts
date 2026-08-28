/**
 * T16 — ЧАЕВЫЕ ЧЕРЕЗ QR
 *
 * Реальная статистика чаевых хранится в localStorage под ключом `gaze_tips`
 * (массив записей { amount, name, at }). Никакого демо-сидирования: если мастер
 * ещё не получил чаевых, статистика пустая. Запись появляется через страницу
 * оплаты по QR «Отправить чаевые» — на реальном этапе это будет платёжный
 * провайдер, пока — имитация внутри приложения.
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

/**
 * Легаси-демо-чаевые (сидировались в старых версиях: 500/Марина Соколова,
 * 200/Ольга Виноградова, 500/Алина Гусева). Узнаём по паре «сумма + имя»
 * и удаляем при загрузке — реальные чаевые мастера не трогаем.
 */
const LEGACY_DEMO_TIPS: ReadonlyArray<{ amount: number; name: string }> = [
  { amount: 500, name: 'Марина Соколова' },
  { amount: 200, name: 'Ольга Виноградова' },
  { amount: 500, name: 'Алина Гусева' },
]

function readAll(): TipRecord[] {
  try {
    const raw = localStorage.getItem(TIPS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Краевой случай: повреждённые/не-массивные данные не должны валить экран
      if (Array.isArray(parsed)) return parsed as TipRecord[]
    }
  } catch {
    /* localStorage недоступен или данные повреждены — пустой список */
  }
  return []
}

export function loadTips(): TipRecord[] {
  const all = readAll()
  // Самоочистка от легаси-демо-данных: убираем ТОЛЬКО записи, совпадающие с
  // историческим демо-сидом (сумма + имя). Реальные чаевые остаются.
  const real = all.filter(
    (r) => !LEGACY_DEMO_TIPS.some((d) => d.amount === r.amount && d.name === r.name),
  )
  if (real.length !== all.length) {
    try {
      localStorage.setItem(TIPS_KEY, JSON.stringify(real))
    } catch {
      /* ignore */
    }
  }
  // Флаг-ключ старого сида (ensureTipsSeeded в версиях до 15bdc90) — мусор,
  // больше нигде не читается.
  try {
    localStorage.removeItem('gaze_tips_seeded')
  } catch {
    /* ignore */
  }
  return real
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
