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
  | 'path'
  | 'growth'
  | 'certificate'
  | 'premium'
  | 'aiMarketer'
  | 'invite'
  | 'coverMaker'

/** G2 — Тариф подписки: 'base' (нет подписки) или 'premium' (активна, 990 ₽/мес) */
export type Plan = 'base' | 'premium'

/** Фильтр списка клиентов (ЭКРАН 2: Все · Активные · Давно не был) */
export type ClientFilter = 'all' | 'active' | 'stale'

/** Ключ localStorage для прогресса по урокам академии (T10) */
const ACADEMY_PROGRESS_KEY = 'gaze-academy-progress'

/** T11 — Ключ localStorage для заданий уроков: courseId_lessonId → { done, answer } */
const ASSIGNMENTS_KEY = 'gaze_assignments'

/** G2 — Ключ localStorage тарифа: 'base' | 'premium' (демо-переключение без бэкенда) */
const SUBSCRIPTION_KEY = 'gaze_subscription'

/** G2 — Загружаем тариф из localStorage при старте (по умолчанию — базовый) */
function loadPlan(): Plan {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY)
    if (raw === 'premium') return 'premium'
    return 'base'
  } catch {
    return 'base'
  }
}

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
  /** G2 — Тариф: 'base' (подписка не активна) или 'premium' (активна, 990 ₽/мес). Производный от реальной подписки. */
  plan: Plan
  /** Реальная подписка из Supabase (masters.subscription_status: new/trial/active/trial_expired/expired) */
  subscriptionStatus: string
  /** Дата окончания подписки (ISO), '' если нет */
  subscriptionEnd: string
  /** G1b — Путь роста: откуда открыт экран «Путь» (для кнопки «Назад») */
  pathOrigin: 'knowledge' | 'dashboard'
  /** G1c — Сертификат: достигнутый уровень, на который выдан сертификат */
  certificateLevel: number

  navigate: (screen: Screen) => void
  openClient: (clientId: string) => void
  /** G1b — Открыть экран «Путь роста» (карта 6 уровней) */
  openPath: (origin?: 'knowledge' | 'dashboard') => void
  /** G1c — Открыть экран «Сертификат» (уровень = достигнутый уровень мастера) */
  openCertificate: (level: number) => void
  /** G3 — Открыть экран «3 рычага роста мастера» (стартовый блок обучения) */
  openGrowth: () => void
  /** G2 — Демо-переключение тарифа (без оплаты): сохраняет в localStorage */
  setPlan: (plan: Plan) => void
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
  /**
   * Применить реальную подписку мастера (из Supabase). plan становится
   * производным: subscription_status='active' (и подписка не истекла) →
   * 'premium' (полный доступ, 990 ₽/мес), иначе 'base' (пейволл).
   * Вызывается после resolveMaster (в т.ч. после оплаты — force-обновлением).
   */
  applySubscription: (status: string, end: string) => void
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
  plan: loadPlan(),
  subscriptionStatus: '',
  subscriptionEnd: '',
  pathOrigin: 'knowledge',
  certificateLevel: 1,

  navigate: (screen) => set({ screen, direction: 'forward' }),

  openPath: (origin = 'knowledge') =>
    set({ screen: 'path', pathOrigin: origin, direction: 'forward' }),

  openCertificate: (level) => set({ screen: 'certificate', certificateLevel: level, direction: 'forward' }),

  openGrowth: () => set({ screen: 'growth', direction: 'forward' }),

  /** Реальная подписка: 'active' и не истекла → план 'premium' (полный доступ, 990 ₽/мес). */
  applySubscription: (status, end) => {
    let plan: Plan = 'base'
    if (status === 'active') {
      const expired = end && new Date(end + 'T00:00:00').getTime() < Date.now()
      if (!expired) plan = 'premium'
    }
    set({ plan, subscriptionStatus: status || '', subscriptionEnd: end || '' })
  },

  setPlan: (plan) => {
    try {
      localStorage.setItem(SUBSCRIPTION_KEY, plan)
    } catch {
      /* localStorage недоступен — тариф живёт в памяти */
    }
    set({ plan })
  },

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
      if (state.screen === 'premium' || state.screen === 'aiMarketer') {
        // G2 — Премиум и AI-маркетолог открываются из профиля (главная точка входа)
        return { screen: 'profile', direction: 'back' }
      }
      if (state.screen === 'path') {
        // G1b — «Путь роста»: назад — туда, откуда открыт (Академия или Дашборд)
        return { screen: state.pathOrigin, direction: 'back' }
      }
      if (state.screen === 'growth') {
        // G3 — «3 рычага роста»: назад — в академию (хаб обучения)
        return { screen: 'knowledge', direction: 'back' }
      }
      if (state.screen === 'certificate') {
        // G1c — «Сертификат»: назад — в «Путь роста» (оттуда открывается)
        return { screen: 'path', direction: 'back' }
      }
      if (state.screen === 'invite') {
        // T6 — «Пригласить»: назад — в профиль (оттуда открывается)
        return { screen: 'profile', direction: 'back' }
      }
      if (state.screen === 'coverMaker') {
        // Генератор обложек: назад — в профиль (оттуда открывается)
        return { screen: 'profile', direction: 'back' }
      }
      return { screen: 'dashboard', direction: 'back' }
    }),
}))
