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
  | 'tips'
  | 'tipsPay'
  | 'expenses'
  | 'community'
  | 'communityProfile'

/** Фильтр списка клиентов (ЭКРАН 2: Все · Активные · Давно не был) */
export type ClientFilter = 'all' | 'active' | 'stale'

/** Ключ localStorage для прогресса по урокам академии (T10) */
const ACADEMY_PROGRESS_KEY = 'gaze-academy-progress'

/** T11 — Ключ localStorage для заданий уроков: courseId_lessonId → { done, answer } */
const ASSIGNMENTS_KEY = 'gaze_assignments'

/** T11 — Состояние выполненного задания урока */
export interface AssignmentState {
  /** Задание выполнено */
  done: boolean
  /** Ответ мастера: текст (для text) или сводка отмеченных пунктов (для checklist) */
  answer?: string
}

/** Загружаем прогресс (lessonId → пройдено) из localStorage при старте */
function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ACADEMY_PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

/** T11 — Загружаем задания (courseId_lessonId → состояние) из localStorage */
function loadAssignments(): Record<string, AssignmentState> {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, AssignmentState>) : {}
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
  /** T11 — Состояние заданий уроков: `${courseId}_${lessonId}` → { done, answer }
      (персистится в localStorage, ключ gaze_assignments) */
  assignments: Record<string, AssignmentState>

  /** T16 — ЧАЕВЫЕ: выбранная сумма (для страницы оплаты по QR, демо) */
  tipsAmount: number
  /** T20 — Сообщество: выбранный мастер для профиля (или 'me') */
  communityMasterId: string | null

  navigate: (screen: Screen) => void
  openClient: (clientId: string) => void
  /** T20 — Открыть профиль мастера в сообществе */
  openCommunityProfile: (masterId: string) => void
  /** Открыть форму записи процедуры для клиента (или без клиента) */
  openAddProcedure: (clientId: string | null) => void
  /** T16 — Открыть экран «Чаевые» (QR) для клиента */
  openTips: (clientId: string | null) => void
  /** T16 — Открыть страницу оплаты чаевых (по ссылке из QR) */
  openTipsPay: (amount?: number) => void
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
  /** T11 — Сохранить ответ/выполнение задания урока (courseId_lessonId → state) */
  saveAssignment: (courseId: string, lessonId: string, data: Partial<AssignmentState>) => void
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
  assignments: loadAssignments(),
  tipsAmount: 100,
  communityMasterId: null,

  navigate: (screen) => set({ screen, direction: 'forward' }),

  openCommunityProfile: (masterId) =>
    set({ screen: 'communityProfile', communityMasterId: masterId, direction: 'forward' }),

  openClient: (clientId) =>
    set({ screen: 'clientProfile', selectedClientId: clientId, direction: 'forward' }),

  openAddProcedure: (clientId) =>
    set({ screen: 'addProcedure', selectedClientId: clientId, direction: 'forward' }),

  openTips: (clientId) =>
    set({ screen: 'tips', selectedClientId: clientId, direction: 'forward' }),

  openTipsPay: (amount) =>
    set({ screen: 'tipsPay', direction: 'forward', tipsAmount: amount ?? 100 }),

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

  saveAssignment: (courseId, lessonId, data) =>
    set((state) => {
      const key = `${courseId}_${lessonId}`
      const prev = state.assignments[key] ?? { done: false }
      const assignments = { ...state.assignments, [key]: { ...prev, ...data } }
      try {
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
      } catch {
        /* localStorage недоступен — состояние живёт в памяти */
      }
      return { assignments }
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
      if (state.screen === 'tips') {
        // Назад — на профиль клиента (selectedClientId сохраняем)
        return { screen: 'clientProfile', direction: 'back' }
      }
      if (state.screen === 'tipsPay') {
        // Назад — на экран «Чаевые» (QR)
        return { screen: 'tips', direction: 'back' }
      }
      if (state.screen === 'expenses') {
        // T17 — назад — в аналитику (оттуда открывается экран «Расходы»)
        return { screen: 'analytics', direction: 'back' }
      }
      return { screen: 'dashboard', direction: 'back' }
    }),
}))
