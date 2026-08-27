import { create } from 'zustand'
import { resolveMaster } from '../lib/api'
import { getTelegramUserId, hasTelegramInitData } from '../lib/telegram'
import type { Master } from '../lib/mock'
import { useAppStore } from './useAppStore'

type MasterStatus = 'idle' | 'loading' | 'ready' | 'error'

interface MasterState {
  master: Master | null
  isDev: boolean
  /** true — приложение работает на демо-данных (RLS без auth, этап 3) */
  isDemo: boolean
  status: MasterStatus
  error: string | null
  /** Определяет мастера по telegram_id (upsert). force — повтор после ошибки. */
  init: (force?: boolean) => Promise<void>
}

let started = false

/** Записать мастера в стор + синхронизировать реальную подписку в app-стор (G2-реал). */
function commitMaster(master: Master, isDev: boolean, isDemo: boolean) {
  useAppStore.getState().applySubscription(master.subscription_status, master.subscription_end)
  return { master, isDev, isDemo, status: 'ready' as const, error: null }
}

export const useMasterStore = create<MasterState>((set) => ({
  master: null,
  isDev: false,
  isDemo: false,
  status: 'idle',
  error: null,

  init: async (force = false) => {
    if (started && !force) return
    started = true
    set({ status: 'loading', error: null })

    const res = await resolveMaster(force)

    // G4 — страховка от гонки инициализации initData: если первый прогон ушёл
    // в демо, но приложение на самом деле открыто из Telegram (initData пришёл
    // чуть позже) — делаем повторный прогон как для реального мастера.
    if (!force && res.isDemo && hasTelegramInitData() && getTelegramUserId() !== null) {
      const retry = await resolveMaster(true)
      if (retry.master) {
        set(commitMaster(retry.master, retry.isDev, retry.isDemo))
        return
      }
    }

    if (res.master) {
      set(commitMaster(res.master, res.isDev, res.isDemo))
    } else {
      set({
        master: null,
        isDev: res.isDev,
        isDemo: res.isDemo,
        status: 'error',
        error: res.error ?? 'Не удалось определить мастера',
      })
    }
  },
}))
