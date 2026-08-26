/**
 * GAZE Platform — T3: онбординг-квест «Начни с 3 шагов» (эффект владения / ИКЕА).
 *
 * Прогресс хранится в localStorage под ключом `gaze_onboarding`:
 *   { client: boolean, procedure: boolean, insight: boolean }
 *
 * Квест — локальный (до этапа с бэкендом): состояние живёт в браузере мастера,
 * поэтому ни демо-режим, ни RLS, ни T1/T2 не затрагиваются.
 */

export interface OnboardingState {
  /** Шаг 1 — «Добавь первого клиента» (AddClient) */
  client: boolean
  /** Шаг 2 — «Запиши первую процедуру» (AddProcedure) */
  procedure: boolean
  /** Шаг 3 — «Открой инсайты» (блок «Кого вернуть», T2) */
  insight: boolean
}

export const ONBOARDING_KEY = 'gaze_onboarding'

export type OnboardingStep = keyof OnboardingState

const DEFAULT_STATE: OnboardingState = {
  client: false,
  procedure: false,
  insight: false,
}

/** Читает прогресс квеста из localStorage (безопасно: приватный режим / ошибки JSON) */
export function loadOnboarding(): OnboardingState {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>
    return {
      client: Boolean(parsed?.client),
      procedure: Boolean(parsed?.procedure),
      insight: Boolean(parsed?.insight),
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

/** Пишет прогресс квеста в localStorage */
export function saveOnboarding(state: OnboardingState): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state))
  } catch {
    // localStorage недоступен (приватный режим) — квест просто не запомнится
  }
}

/** Отмечает шаг сделанным и сохраняет. Возвращает новое состояние. */
export function markOnboardingStep(step: OnboardingStep): OnboardingState {
  const next = { ...loadOnboarding(), [step]: true }
  saveOnboarding(next)
  return next
}

/** Все 3 шага выполнены? */
export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.client && state.procedure && state.insight
}

/** Сколько шагов выполнено (0–3) */
export function onboardingProgress(state: OnboardingState): number {
  return Number(state.client) + Number(state.procedure) + Number(state.insight)
}
