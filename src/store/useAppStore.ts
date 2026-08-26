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
  | 'course'
  | 'lesson'

/** Фильтр списка клиентов (ЭКРАН 2: Все · Активные · Давно не был) */
export type ClientFilter = 'all' | 'active' | 'stale'

/** Ключ localStorage для прогресса по урокам академии (T10) */
const ACADEMY_PROGRESS_KEY = 'gaze-academy-progress'

/** Загружаем прогресс (lessonId → пройдено) из localStorage при старте */
function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ACADEMY_PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

interface AppState {
  screen: Screen
  selectedClientId: string | null
  /** Направление анимации перехода (slide-left вперёд, slide-right назад) */
  direction: 'forward' | 'back'
  /** Фильтр, который должен примениться при следующем открытии экрана Клиенты
      (например, «Посмотреть список» из карточки-рекомендации в Аналитике) */
  pendingClientsFilter: ClientFilter | null

  /* T10 — академия: навигация курсы → уроки + прогресс мастера */
  selectedCourseId: string | null
  selectedLessonId: string | null
  /** Прогресс по урокам: lessonId → true, если пройден (персистится в localStorage) */
  completedLessons: Record<string, boolean>

  navigate: (screen: Screen) => void
  openClient: (clientId: string) => void
  /** Открыть форму записи процедуры для клиента (или без клиента) */
  openAddProcedure: (clientId: string | null) => void
  /** Открыть Клиенты с предустановленным фильтром */
  openClientsWithFilter: (filter: ClientFilter) => void
  /** Сбросить отложенный фильтр после применения */
  consumeClientsFilter: () => void
  /** Открыть курс академии (T10) */
  openCourse: (courseId: string) => void
  /** Открыть урок внутри курса (T10) */
  openLesson: (courseId: string, lessonId: string) => void
  /** Отметить урок пройденным (T10): сохраняет и в localStorage */
  markLessonCompleted: (lessonId: string) => void
  goBack: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedClientId: null,
  direction: 'forward',
  pendingClientsFilter: null,
  selectedCourseId: null,
  selectedLessonId: null,
  completedLessons: loadProgress(),

  navigate: (screen) => set({ screen, direction: 'forward' }),

  openClient: (clientId) =>
    set({ screen: 'clientProfile', selectedClientId: clientId, direction: 'forward' }),

  openAddProcedure: (clientId) =>
    set({ screen: 'addProcedure', selectedClientId: clientId, direction: 'forward' }),

  openClientsWithFilter: (filter) =>
    set({ screen: 'clients', pendingClientsFilter: filter, direction: 'forward' }),

  consumeClientsFilter: () => set({ pendingClientsFilter: null }),

  openCourse: (courseId) =>
    set({ screen: 'course', selectedCourseId: courseId, selectedLessonId: null, direction: 'forward' }),

  openLesson: (courseId, lessonId) =>
    set({ screen: 'lesson', selectedCourseId: courseId, selectedLessonId: lessonId, direction: 'forward' }),

  markLessonCompleted: (lessonId) =>
    set((state) => {
      const completedLessons = { ...state.completedLessons, [lessonId]: true }
      try {
        localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify(completedLessons))
      } catch {
        /* localStorage недоступен (приватный режим) — прогресс живёт в памяти */
      }
      return { completedLessons }
    }),

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
      if (state.screen === 'lesson') {
        // Назад — в курс (selectedCourseId сохраняем)
        return { screen: 'course', selectedLessonId: null, direction: 'back' }
      }
      if (state.screen === 'course') {
        // Назад — в академию (хаб)
        return { screen: 'knowledge', selectedCourseId: null, direction: 'back' }
      }
      return { screen: 'dashboard', direction: 'back' }
    }),
}))
