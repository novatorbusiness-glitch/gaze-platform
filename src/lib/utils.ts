/** Утилиты форматирования и хелперы (ТЗ, Часть 2 — lib/utils.ts) */

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** 12 400 ₽ */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽'
}

/** 12 авг */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

/** 12 августа 2026 */
export function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Анна Иванова → АИ */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Приветствие по времени суток (утро/день/вечер) */
export function greeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

/** Сколько дней прошло с даты (YYYY-MM-DD) */
export function daysSince(iso: string): number {
  const d = new Date(iso + 'T00:00:00').getTime()
  return Math.max(0, Math.floor((Date.now() - d) / 86_400_000))
}
