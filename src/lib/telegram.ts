/**
 * Telegram Web App SDK хелперы (ТЗ, Часть 2 — lib/telegram.ts, Часть 5)
 */
import WebApp from '@twa-dev/sdk'

export function initTelegram(): { user: typeof WebApp.initDataUnsafe.user; colorScheme: 'light'; platform: string } {
  WebApp.ready()
  WebApp.expand() // Раскрыть на весь экран

  // Тема — берём из Telegram, но перезаписываем на GAZE
  document.documentElement.style.setProperty('--tg-theme-bg-color', '#F9F8F6')
  document.documentElement.style.setProperty('--tg-theme-text-color', '#2A2521')

  try {
    WebApp.setHeaderColor('#F9F8F6')
    WebApp.setBackgroundColor('#F9F8F6')
  } catch {
    /* доступно не на всех платформах */
  }

  return {
    user: WebApp.initDataUnsafe.user,
    colorScheme: 'light', // Всегда light для GAZE
    platform: WebApp.platform,
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
