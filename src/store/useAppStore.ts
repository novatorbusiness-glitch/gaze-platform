import { create } from 'zustand'

export type Screen =
  | 'dashboard'
  | 'clients'
  | 'analytics'
  | 'knowledge'
  | 'profile'
  | 'clientProfile'

interface AppState {
  screen: Screen
  selectedClientId: string | null
  /** Направление анимации перехода (slide-left вперёд, slide-right назад) */
  direction: 'forward' | 'back'
  navigate: (screen: Screen) => void
  openClient: (clientId: string) => void
  goBack: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedClientId: null,
  direction: 'forward',

  navigate: (screen) => set({ screen, direction: 'forward' }),

  openClient: (clientId) =>
    set({ screen: 'clientProfile', selectedClientId: clientId, direction: 'forward' }),

  goBack: () =>
    set((state) => {
      if (state.screen === 'clientProfile') {
        return { screen: 'clients', selectedClientId: null, direction: 'back' }
      }
      return { screen: 'dashboard', direction: 'back' }
    }),
}))
