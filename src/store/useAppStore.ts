import { create } from 'zustand'

export type Screen =
  | 'dashboard'
  | 'clients'
  | 'analytics'
  | 'knowledge'
  | 'bonuses'
  | 'chat'
  | 'profile'
  | 'clientProfile'
  | 'addProcedure'
  | 'addClient'

/** Фильтр списка клиентов (ЭКРАН 2: Все · Активные · Давно не был) */
export type ClientFilter = 'all' | 'active' | 'stale'

interface AppState {
  screen: Screen
  selectedClientId: string | null
  /** Направление анимации перехода (slide-left вперёд, slide-right назад) */
  direction: 'forward' | 'back'
  /** Фильтр, который должен примениться при следующем открытии экрана Клиенты
      (например, «Посмотреть список» из карточки-рекомендации в Аналитике) */
  pendingClientsFilter: ClientFilter | null
  navigate: (screen: Screen) => void
  openClient: (clientId: string) => void
  /** Открыть форму записи процедуры для клиента (или без клиента) */
  openAddProcedure: (clientId: string | null) => void
  /** Открыть Клиенты с предустановленным фильтром */
  openClientsWithFilter: (filter: ClientFilter) => void
  /** Сбросить отложенный фильтр после применения */
  consumeClientsFilter: () => void
  goBack: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedClientId: null,
  direction: 'forward',
  pendingClientsFilter: null,

  navigate: (screen) => set({ screen, direction: 'forward' }),

  openClient: (clientId) =>
    set({ screen: 'clientProfile', selectedClientId: clientId, direction: 'forward' }),

  openAddProcedure: (clientId) =>
    set({ screen: 'addProcedure', selectedClientId: clientId, direction: 'forward' }),

  openClientsWithFilter: (filter) =>
    set({ screen: 'clients', pendingClientsFilter: filter, direction: 'forward' }),

  consumeClientsFilter: () => set({ pendingClientsFilter: null }),

  goBack: () =>
    set((state) => {
      if (state.screen === 'clientProfile') {
        return { screen: 'clients', selectedClientId: null, direction: 'back' }
      }
      if (state.screen === 'addProcedure') {
        // Назад — на профиль клиента (selectedClientId сохраняем)
        return { screen: 'clientProfile', direction: 'back' }
      }
      if (state.screen === 'addClient') {
        // Назад — на список клиентов
        return { screen: 'clients', direction: 'back' }
      }
      return { screen: 'dashboard', direction: 'back' }
    }),
}))
