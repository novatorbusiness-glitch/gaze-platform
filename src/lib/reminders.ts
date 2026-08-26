/**
 * T14 — Реальные напоминания клиенту через Telegram.
 *
 * Раньше «Отправить напоминание» показывало пустой тост «Отправлено ✓» в никуда.
 * Теперь кнопка формирует РЕАЛЬНУЮ доставку:
 *  1. Если настроен VITE_REMINDER_API (локально/через тоннель) — сначала пробуем
 *     реально отправить через бота: POST {username, text} на /api/send-reminder.
 *     Бот сам ищет chat_id клиента (getChat) и шлёт сообщение от своего имени.
 *  2. Если бот недоступен или клиент не в боте — открываем deep-link
 *     https://t.me/<username>?text=<сообщение> (Telegram сам подставит текст
 *     в поле ввода — мастеру остаётся только нажать «Отправить»).
 *  3. Нет username → копируем телефон.
 *
 * Состояние «Отправлено» хранится в localStorage (gaze_reminders_sent_v1),
 * чтобы после перезагрузки мини-апп не предлагал отправить повторно.
 */
import WebApp from '@twa-dev/sdk'
import { haptic } from './telegram'

const SENT_KEY = 'gaze_reminders_sent_v1'

export interface TgTarget {
  /** username без @ и без t.me/ */
  username: string
  /** @username — для отображения */
  display: string
  /** https://t.me/<username> */
  href: string
}

/**
 * Нормализуем ссылку клиента (T15): @username / https://t.me/... / t.me/...
 * Возвращает null, если telegram-ссылки нет (например, инстаграм или пусто).
 */
export function parseClientLink(link?: string | null): TgTarget | null {
  if (!link) return null
  const v = link.trim()
  if (!v) return null
  let m = v.match(/^(?:https?:\/\/)?t\.me\/([A-Za-z0-9_]{5,})/)
  if (m) return { username: m[1], display: `@${m[1]}`, href: `https://t.me/${m[1]}` }
  m = v.match(/^@([A-Za-z0-9_]{5,})$/)
  if (m) return { username: m[1], display: `@${m[1]}`, href: `https://t.me/${m[1]}` }
  return null
}

/** Deep-link t.me/<username>?text=… — Telegram откроет чат и подставит текст. */
export function buildTgChatUrl(username: string, text: string): string {
  return `https://t.me/${username}?text=${encodeURIComponent(text)}`
}

/** Открыть t.me-ссылку: внутри Telegram WebView — через SDK, иначе новой вкладкой. */
export function openTelegramLink(url: string): void {
  haptic('medium')
  try {
    WebApp.openTelegramLink(url)
  } catch {
    window.open(url, '_blank', 'noopener')
  }
}

/* ---------------- localStorage: состояние «Отправлено» ---------------- */

type SentMap = Record<string, { template: string; at: string }>

function readSent(): SentMap {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as SentMap
  } catch {
    return {}
  }
}

export function isReminderSent(clientId: string): boolean {
  return Boolean(readSent()[clientId])
}

export function listSentClientIds(): string[] {
  return Object.keys(readSent())
}

export function markReminderSent(clientId: string, template: string): void {
  const map = readSent()
  map[clientId] = { template, at: new Date().toISOString() }
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/* ---------------- отправка через бота (опционально) ---------------- */

const BOT_API = (import.meta.env.VITE_REMINDER_API as string | undefined)?.replace(/\/+$/, '')

export interface BotSendResult {
  ok: boolean
  /** true — бот реально доставил сообщение клиенту */
  delivered: boolean
  reason: 'no_backend' | 'not_in_bot' | 'error' | 'sent'
}

/**
 * Пробуем реально отправить через бота (POST /api/send-reminder).
 * Работает только если задан VITE_REMINDER_API (локальный dev или тоннель).
 * В проде (GitHub Pages) бэкенд недоступен → no_backend → мини-апп уходит на deep-link.
 */
export async function sendViaBot(username: string, text: string): Promise<BotSendResult> {
  if (!BOT_API) return { ok: false, delivered: false, reason: 'no_backend' }
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(`${BOT_API}/api/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, text }),
      signal: ctrl.signal,
    })
    if (res.ok) return { ok: true, delivered: true, reason: 'sent' }
    let reason: BotSendResult['reason'] = 'error'
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error === 'not_in_bot') reason = 'not_in_bot'
    } catch {
      /* ignore */
    }
    return { ok: false, delivered: false, reason }
  } catch {
    return { ok: false, delivered: false, reason: 'no_backend' }
  } finally {
    window.clearTimeout(timer)
  }
}
