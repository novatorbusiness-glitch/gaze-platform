import { create } from 'zustand'
import { resolveMaster } from '../lib/api'
import type { Master } from '../lib/mock'

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

    if (res.master) {
      set({
        master: res.master,
        isDev: res.isDev,
        isDemo: res.isDemo,
        status: 'ready',
        error: null,
      })
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
