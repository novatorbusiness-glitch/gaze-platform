/**
 * Telegram Web App SDK хелперы (ТЗ, Часть 2 — lib/telegram.ts, Часть 5)
 */
import WebApp from '@twa-dev/sdk'

export interface TelegramInitResult {
  user: {
    id: number
    first_name?: string
    last_name?: string
    username?: string
  } | null
  colorScheme: 'light'
  platform: string
  /** true, если окружение Telegram WebView доступно и SDK отвечает */
  isTelegram: boolean
}

/** Безопасное чтение user из initDataUnsafe (вне Telegram — null) */
function getWebAppUser(): TelegramInitResult['user'] {
  try {
    return WebApp.initDataUnsafe?.user ?? null
  } catch {
    return null
  }
}

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

/** telegram_id текущего пользователя (вне Telegram — null) */
export function getTelegramUserId(): number | null {
  try {
    return WebApp.initDataUnsafe?.user?.id ?? null
  } catch {
    return null
  }
}

/** Имя пользователя из Telegram (для создания записи мастера) */
export function getTelegramUserName(): string | null {
  try {
    const user = WebApp.initDataUnsafe?.user
    if (!user) return null
    const first = user.first_name ?? ''
    const last = user.last_name ?? ''
    return (first + ' ' + last).trim() || null
  } catch {
    return null
  }
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
