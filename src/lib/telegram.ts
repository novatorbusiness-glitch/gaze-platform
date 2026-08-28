/**
 * GAZE Platform — Telegram Web App SDK хелперы (ТЗ, Часть 2 — lib/telegram.ts, Часть 5)
 *
 * G4 — ВАЖНО про initData: @twa-dev/sdk v8 парсит initData ТОЛЬКО из URL-hash
 * (`#tgWebAppData=...`, старый формат Telegram Games). Современный Telegram
 * открывает Mini App с initData в QUERY-строке (`?tgWebAppData=...`), которую
 * SDK не видит: initDataUnsafe пустой, getTelegramUserId() возвращал null, и
 * мастер уходил в демо-режим ДАЖЕ при открытии через WebApp-кнопку из бота
 * (это и была причина бага персонального входа Ани, telegram_id 451301535).
 *
 * Все геттеры ниже читают initData из ВСЕХ источников — query → hash → SDK —
 * и достают user напрямую, так что вход работает при любом формате Telegram.
 */
import WebApp from '@twa-dev/sdk'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export interface TelegramInitResult {
  user: TelegramUser | null
  colorScheme: 'light'
  platform: string
  /** true, если окружение Telegram WebView доступно и SDK отвечает */
  isTelegram: boolean
}

/* ------------------------------------------------------------------ */
/* initData: чтение из всех источников (G4)                            */
/* ------------------------------------------------------------------ */

/** Сырое initData из URL query (?tgWebAppData=...) — современный формат Telegram Mini Apps */
function initDataFromQuery(): string {
  try {
    const v = new URLSearchParams(window.location.search).get('tgWebAppData')
    return v && v.length ? v : ''
  } catch {
    return ''
  }
}

/** Сырое initData из URL hash (#tgWebAppData=...) — старый формат Telegram Games */
function initDataFromHash(): string {
  try {
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return ''
    const v = new URLSearchParams(hash).get('tgWebAppData')
    return v && v.length ? v : ''
  } catch {
    return ''
  }
}

/** Сырое initData из самого SDK (если он его распарсил из hash) */
function initDataFromSdk(): string {
  try {
    const d = WebApp.initData
    return d && d.length ? d : ''
  } catch {
    return ''
  }
}

/**
 * Сырое initData из всех источников (query → hash → SDK).
 * Пустая строка — вне Telegram.
 */
export function getTelegramInitData(): string {
  return initDataFromQuery() || initDataFromHash() || initDataFromSdk()
}

/** true, если Telegram передал initData (приложение открыто из Telegram) */
export function hasTelegramInitData(): boolean {
  return getTelegramInitData().length > 0
}

/** true, когда приложение открыто из Telegram (initData передан). */
export function isTelegramContext(): boolean {
  return hasTelegramInitData()
}

/** Парсинг user из сырого initData (поле user = JSON внутри query-строки) */
export function parseInitDataUser(raw: string): TelegramUser | null {
  if (!raw) return null
  try {
    const userJson = new URLSearchParams(raw).get('user')
    if (!userJson) return null
    const u = JSON.parse(userJson) as TelegramUser
    return u && typeof u.id === 'number' ? u : null
  } catch {
    return null
  }
}

/**
 * Безопасное чтение user из initData.
 * Сначала SDK (hash-формат), затем прямой парсинг query/hash (G4 — чинит
 * современный формат Telegram, который SDK не видит).
 */
function getWebAppUser(): TelegramUser | null {
  try {
    const sdkUser = WebApp.initDataUnsafe?.user
    if (sdkUser && typeof sdkUser.id === 'number') return sdkUser as TelegramUser
  } catch {
    /* вне Telegram SDK может кидать — молча */
  }
  return parseInitDataUser(getTelegramInitData())
}

/* ------------------------------------------------------------------ */
/* Инициализация                                                       */
/* ------------------------------------------------------------------ */

/**
 * Инициализация Telegram Web App.
 * ПОЛНОСТЬЮ безопасна: вне Telegram WebView (обычный браузер, превью,
 * динамический импорт бандла) методы SDK могут бросать — всё в try/catch,
 * приложение рендерится в любом случае.
 */
export function initTelegram(): TelegramInitResult {
  const isTelegram =
    typeof WebApp !== 'undefined' && typeof WebApp.ready === 'function'

  if (isTelegram) {
    try {
      WebApp.ready()
    } catch {
      /* вне Telegram WebView SDK может кидать — деградируем молча */
    }
    try {
      WebApp.expand() // Раскрыть на весь экран
    } catch {
      /* ignore */
    }
  }

  // Тема — ставим всегда, независимо от Telegram (фирменные цвета GAZE)
  try {
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#F9F8F6')
    document.documentElement.style.setProperty('--tg-theme-text-color', '#2A2521')
  } catch {
    /* ignore */
  }

  try {
    WebApp.setHeaderColor('#F9F8F6')
    WebApp.setBackgroundColor('#F9F8F6')
  } catch {
    /* доступно не на всех платформах */
  }

  let platform = 'unknown'
  try {
    platform = WebApp.platform || 'unknown'
  } catch {
    /* ignore */
  }

  return {
    user: getWebAppUser(),
    colorScheme: 'light', // Всегда light для GAZE
    platform,
    isTelegram,
  }
}

export type HapticStyle = 'light' | 'medium' | 'heavy'

/**
 * telegram_id текущего пользователя (вне Telegram — null).
 * G4: раньше читался только WebApp.initDataUnsafe.user.id (hash-формат SDK) —
 * в современном формате Telegram (query-строка) возвращал null и мастер
 * уходил в демо. Теперь + прямой парсинг query/hash initData.
 */
export function getTelegramUserId(): number | null {
  const u = getWebAppUser()
  return u ? u.id : null
}

/** Имя пользователя из Telegram (для создания записи мастера) */
export function getTelegramUserName(): string | null {
  const u = getWebAppUser()
  if (!u) return null
  const first = u.first_name ?? ''
  const last = u.last_name ?? ''
  return (first + ' ' + last).trim() || null
}

/**
 * G4 — дождаться telegram_id, если Telegram передал initData, но user ещё не
 * распарсен (гонка при холодном старте WebView/iframe-клиентов). Вне Telegram
 * (нет initData) возвращает null сразу — демо-режим не задерживается.
 */
export async function resolveTelegramUserId(opts?: {
  waitIfPending?: boolean
  timeoutMs?: number
}): Promise<number | null> {
  const immediate = getTelegramUserId()
  if (immediate !== null) return immediate
  if (!opts?.waitIfPending || !hasTelegramInitData()) return null

  const deadline = Date.now() + (opts.timeoutMs ?? 2500)
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100))
    const id = getTelegramUserId()
    if (id !== null) return id
  }
  return getTelegramUserId()
}

/** Тактильная отдача (ТЗ: haptic feedback на тапах) */
export function haptic(style: HapticStyle = 'light'): void {
  try {
    WebApp.HapticFeedback.impactOccurred(style)
  } catch {
    /* вне Telegram — тихо */
  }
}

export function hapticSuccess(): void {
  try {
    WebApp.HapticFeedback.notificationOccurred('success')
  } catch {
    /* ignore */
  }
}

/** Копирование с тактильной отдачей (телефон клиента и т.п.) */
export async function copyText(text: string): Promise<void> {
  haptic('medium')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

/** Ссылка на карточку клиента: <текущий URL мини-аппа>#client/<id>.
 *  Открытие такой ссылки обрабатывается в App.tsx (hash-роутинг) —
 *  при загрузке/изменении хэша экран «Профиль клиента» открывается сразу. */
export function clientShareLink(clientId: string): string {
  const base = window.location.origin + window.location.pathname
  return `${base}#client/${encodeURIComponent(clientId)}`
}

/* ------------------------------------------------------------------ */
/* Оплата тарифа GAZE: deep-link в бота (Telegram Stars)               */
/* ------------------------------------------------------------------ */

/** Юзернейм бота GAZE (без @) — из .env (VITE_BOT_USERNAME) или фолбэк */
export function botUsername(): string {
  const fromEnv = (import.meta.env.VITE_BOT_USERNAME as string | undefined) ?? ''
  return fromEnv.replace(/^@/, '').trim() || 'gaze_arch_bot'
}

/** Тариф GAZE: 'basic' — Базовый (курс «До 200к», 990 ₽/мес), 'premium' — Премиум (AI-маркетолог, 1 500 ₽/мес) */
export type GazePlan = 'basic' | 'premium'

/** Payload deep-link: бот шлёт инвойс Stars под нужный тариф (start=pay_basic / start=pay_premium) */
export function subscriptionStartParam(plan: GazePlan = 'premium'): string {
  return plan === 'premium' ? 'pay_premium' : 'pay_basic'
}

/** Ссылка оплаты: t.me/<bot>?start=pay_<plan> — бот сразу присылает инвойс Stars */
export function subscriptionPayUrl(plan: GazePlan = 'premium'): string {
  return `https://t.me/${botUsername()}?start=${subscriptionStartParam(plan)}`
}

/**
 * Открыть оплату тарифа GAZE: открывает чат с ботом с payload start=pay_<plan>,
 * бот немедленно присылает инвойс Telegram Stars. В Telegram WebView
 * используем WebApp.openTelegramLink (чат открывается поверх мини-аппа,
 * не выходя из него), вне Telegram — window.open.
 */
export function openSubscriptionPayment(plan: GazePlan = 'premium'): void {
  const url = subscriptionPayUrl(plan)
  try {
    const sdk = WebApp as unknown as { openTelegramLink?: (u: string) => void }
    if (typeof sdk.openTelegramLink === 'function') {
      sdk.openTelegramLink(url)
      return
    }
  } catch {
    /* SDK недоступен — fallback ниже */
  }
  try {
    window.open(url, '_blank')
  } catch {
    window.location.href = url
  }
}

/* ------------------------------------------------------------------ */
/* AI-маркетолог: генерация перенесена В БОТА (deep-link start=ai_marketer) */
/* ------------------------------------------------------------------ */

/** Ссылка на AI-маркетолога в боте: t.me/<bot>?start=ai_marketer */
export function aiMarketerBotUrl(): string {
  return `https://t.me/${botUsername()}?start=ai_marketer`
}

/**
 * Открыть AI-маркетолога в боте с передачей payload start=ai_marketer.
 *
 * G-FIX (deep-link): WebApp.openTelegramLink на ТОТ ЖЕ бот НЕ передаёт start-пакет —
 * мини-апп просто закрывается и возвращается в чат, бот отвечает обычным /start
 * (подтверждено владельцем). Поэтому вместо официального метода отдаём полную
 * t.me-ссылку так, чтобы Telegram перехватил её и обработал payload:
 *
 *   1) window.open(url, '_blank') — в ряде клиентов (iOS, десктоп) Telegram
 *      перехватывает t.me-ссылку и доставляет start. Если попап заблокирован
 *      (вернул null / бросил исключение, в т.ч. Android по докам) — дальше.
 *   2) window.location.href = url — навигация WebView по t.me-ссылке; Telegram
 *      перехватывает её на уровне WebView (shouldOverrideUrlLoading / navigation
 *      delegate) и открывает чат, обрабатывая start=ai_marketer.
 *   3) WebApp.openTelegramLink(url) — последний фолбэк (официальный API; на том же
 *      боте payload может не дойти, но чат хотя бы откроется).
 */
export function openAiMarketerBot(): void {
  const url = aiMarketerBotUrl()

  // 1) window.open — пробуем первым (задача: Telegram перехватывает полную ссылку)
  let opened = false
  try {
    opened = !!window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    opened = false
  }
  if (opened) return

  // 2) location.href — навигация WebView, перехват t.me на уровне клиента
  try {
    window.location.href = url
    return
  } catch {
    /* переходим к официальному SDK-фолбэку */
  }

  // 3) официальный SDK-метод — хуже (payload может не дойти), но чат откроется
  try {
    const sdk = WebApp as unknown as { openTelegramLink?: (u: string) => void }
    if (typeof sdk.openTelegramLink === 'function') sdk.openTelegramLink(url)
  } catch {
    /* ничего не вышло — в чате пользователь увидит кнопку «AI-маркетолог» */
  }
}
