/**
 * GAZE Platform — T12: ниша (направление) специалиста.
 *
 * Платформа универсальна: подходит маникюру, массажу, косметологии,
 * бровям/ресницам, парикмахерам и другим специалистам. Здесь живёт
 * выбор ниши мастера (профиль/онбординг), сохранение в localStorage
 * (ключ gaze_profile_specialty) и подсказки услуг по нише.
 *
 * Демо-мастер Анна остаётся бьюти-нишей, но любой мастер может выбрать
 * свою категорию — подсказки и примеры подстроятся под неё.
 */

export const SPECIALTY_KEY = 'gaze_profile_specialty'

/** Предустановленные ниши мастера (быстрый выбор в профиле) */
export const SPECIALTY_OPTIONS: string[] = [
  'Маникюр',
  'Массаж',
  'Косметология',
  'Брови/Ресницы',
  'Парикмахер',
  'Другое',
]

/** Нейтральный фолбэк, когда ниша не выбрана и у мастера её нет */
export const DEFAULT_SPECIALTY = ['Специалист']

/** Ниша из localStorage (gaze_profile_specialty) — массив или пустой */
export function readSpecialty(): string[] {
  try {
    const raw = localStorage.getItem(SPECIALTY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
    return []
  } catch {
    return []
  }
}

/** Сохранить нишу мастера в localStorage */
export function saveSpecialty(specialty: string[]): void {
  try {
    localStorage.setItem(SPECIALTY_KEY, JSON.stringify(specialty))
  } catch {
    /* localStorage недоступен (приватный режим) — просто не запомнится */
  }
}

/** Первая ниша из сохранённой (или пустая строка) — для подсказок */
export function firstSpecialty(): string {
  const list = readSpecialty()
  return list[0] ?? ''
}

/**
 * Подсказки услуг под выбранную нишу. Если ниша не выбрана (или «Другое») —
 * нейтральный демо-список примеров по разным направлениям (не жёсткая
 * привязка, а примеры). Каждая ниша получает свои примеры услуг.
 */
const SPECIALTY_SERVICES: Record<string, string[]> = {
  Маникюр: ['Маникюр', 'Покрытие гель-лак', 'Наращивание ногтей', 'Педикюр', 'Ремонт ногтей'],
  Массаж: ['Массаж спины', 'Общий массаж', 'Массаж лица', 'Антицеллюлитный массаж', 'Спортивный массаж'],
  Косметология: ['Чистка лица', 'Пилинг', 'Уход за лицом', 'Массаж лица', 'Инъекционная косметология'],
  'Брови/Ресницы': ['Архитектура бровей', 'Коррекция бровей', 'Окрашивание бровей', 'Ламинирование ресниц', 'Наращивание ресниц'],
  Парикмахер: ['Стрижка', 'Окрашивание', 'Укладка', 'Мелирование', 'Лечение волос'],
}

/** Нейтральный список-пример для «Другое» и случая без выбранной ниши */
const NEUTRAL_SERVICES: string[] = [
  'Маникюр',
  'Массаж',
  'Косметология',
  'Брови',
  'Ресницы',
  'Стрижка',
]

/**
 * Примеры услуг для подсказок в форме «Записать процедуру»:
 * подстраиваются под сохранённую нишу, иначе — нейтральный список.
 */
export function serviceSuggestions(): string[] {
  const niche = firstSpecialty()
  const own = niche ? SPECIALTY_SERVICES[niche] : undefined
  if (own && own.length > 0) return own
  return [...NEUTRAL_SERVICES]
}

/** Заголовок бейджа специализации в чате (сообщество) — нейтральный по умолчанию */
export function displaySpecialty(fallback = 'Специалист'): string {
  const saved = firstSpecialty()
  return saved || fallback
}
