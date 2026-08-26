/**
 * Единый источник имени мастера (fix: имя из Профиля не обновлялось
 * в приветствии дашборда).
 *
 * Приоритет: localStorage (gaze_profile_name) > master.name > 'Анна Казак'.
 *
 * Profile сохраняет имя через saveProfileName (localStorage + событие
 * 'gaze-name-changed'), Dashboard и любые другие экраны читают его через
 * useDisplayName(master) — подписка на событие обновляет приветствие сразу,
 * без перезагрузки, а localStorage хранит его между сессиями.
 */

import { useEffect, useState } from 'react'

export const PROFILE_NAME_KEY = 'gaze_profile_name'
/** Событие: имя сохранено в Профиле — все экраны обновляются */
export const NAME_CHANGED_EVENT = 'gaze-name-changed'
/** Фолбэк, когда имя не задано ни в localStorage, ни у мастера */
export const DEFAULT_NAME = 'Анна Казак'

/** Имя из localStorage (gaze_profile_name) — пустая строка, если нет */
export function readProfileName(): string {
  try {
    return localStorage.getItem(PROFILE_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Структура, откуда можно взять master.name (Master | null) */
export type NameSource = { name?: string | null } | null | undefined

/** Единый источник имени: localStorage > master.name > 'Анна Казак' */
export function getDisplayName(master: NameSource): string {
  const saved = readProfileName().trim()
  if (saved) return saved
  if (master?.name?.trim()) return master.name.trim()
  return DEFAULT_NAME
}

/** Сохранить имя: запись в localStorage + событие для всех экранов */
export function saveProfileName(name: string): void {
  const next = name.trim()
  if (!next) return
  try {
    localStorage.setItem(PROFILE_NAME_KEY, next)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(NAME_CHANGED_EVENT, { detail: next }))
}

/**
 * Реактивное имя мастера. Пересчитывается сразу при:
 *  - событии 'gaze-name-changed' (сохранение в Профиле),
 *  - событии 'storage' (другая вкладка),
 *  - изменении master в сторе.
 */
export function useDisplayName(master: NameSource): string {
  const [name, setName] = useState<string>(() => getDisplayName(master))

  useEffect(() => {
    const sync = (e?: Event) => {
      const detail = (e as CustomEvent<string> | undefined)?.detail
      setName(detail && detail.trim() ? detail.trim() : getDisplayName(master))
    }
    sync()
    window.addEventListener(NAME_CHANGED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(NAME_CHANGED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [master])

  return name
}
