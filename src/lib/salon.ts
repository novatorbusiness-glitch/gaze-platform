/**
 * GAZE Platform — T19: РЕЖИМ «МАСТЕР В САЛОНЕ»
 *
 * Мастер может работать не на себя, а в салоне. Салон даёт мастеру свой %
 * от чека (у каждого свой: 60%, 50%, 70%…). Контакты клиентов салон может
 * скрывать (мастер видит только имя, услугу, цену). Материалы бывают ИЛИ
 * свои (мастер покупает — вычитаются из его дохода), ИЛИ салона (салон
 * даёт — не вычитаются).
 *
 * Настройки живут в localStorage под ключом `gaze_salon`:
 *   { enabled: boolean, percent: number, hideContacts: boolean }
 *
 * Правила расчёта (используются в AddProcedure, Dashboard, Analytics):
 *   - режим «сам» (enabled=false):  доход мастера = вся цена процедуры,
 *     все материалы и расходы вычитаются из дохода мастера (как раньше);
 *   - режим «салон» (enabled=true):  доход мастера = цена × percent/100,
 *     вычитаются ТОЛЬКО «свои» материалы и «свои» расходы.
 */

export const SALON_KEY = 'gaze_salon'

export interface SalonSettings {
  enabled: boolean
  /** Процент от чека, который получает мастер (например 60 = 60%). */
  percent: number
  /** Салон скрывает контакты клиентов (телефон/ссылку). */
  hideContacts: boolean
}

const DEFAULTS: SalonSettings = {
  enabled: false,
  percent: 60,
  hideContacts: false,
}

export function getSalonSettings(): SalonSettings {
  try {
    const raw = localStorage.getItem(SALON_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<SalonSettings>
    return {
      enabled: Boolean(parsed.enabled),
      percent:
        typeof parsed.percent === 'number' && parsed.percent > 0
          ? parsed.percent
          : DEFAULTS.percent,
      hideContacts: Boolean(parsed.hideContacts),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function setSalonSettings(s: SalonSettings): void {
  try {
    localStorage.setItem(SALON_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/**
 * Доход мастера с процедуры с учётом режима салона.
 * - «сам»: весь чек.
 * - «салон»: чек × percent/100.
 */
export function masterIncome(price: number): number {
  const s = getSalonSettings()
  if (!s.enabled) return price
  return Math.round((price * s.percent) / 100)
}

/**
 * Вычитаются ли материалы из дохода мастера.
 * «салон» + материалы салона (costType='salon') → НЕ вычитаются.
 */
export function shouldDeduct(costType: 'own' | 'salon'): boolean {
  const s = getSalonSettings()
  if (!s.enabled) return true
  return costType === 'own'
}

/** Прибыль мастера: доход − свои материалы − свои расходы. */
export function masterProfit(price: number, ownCost: number): number {
  return masterIncome(price) - ownCost
}
