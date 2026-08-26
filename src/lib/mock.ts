/**
 * Mock-данные ЭТАПА 1. Типы повторяют структуру БД Supabase (ТЗ, Часть 2).
 * На этапе 2 данные придут из Supabase — интерфейсы останутся теми же.
 */

export type SubscriptionStatus = 'trial' | 'active' | 'expired'

export interface Master {
  id: string
  telegram_id: number
  name: string
  phone: string
  specialty: string[] // ниша(и) специалиста: 'Маникюр', 'Массаж', 'Косметология', 'Брови/Ресницы', 'Парикмахер', 'Другое' или своя
  avatar_url: string | null
  subscription_status: SubscriptionStatus
  subscription_end: string // date
  is_gaze_graduate: boolean
  referral_code: string
  referred_by: string | null
  created_at: string
  /** Dev/demo: город мастера (этапа 3 нет — поля нет в схеме БД) */
  city?: string
  /** Dev/demo: рейтинг 0–5 */
  rating?: number
  /** Dev/demo: всего клиентов у мастера */
  clients_count?: number
}

export interface Client {
  id: string
  master_id: string
  name: string
  phone: string
  notes: string
  last_visit: string // date
  total_visits: number
  total_spent: number
  bonus_points: number
  created_at: string
}

export interface Procedure {
  id: string
  client_id: string
  master_id: string
  service_type: string // 'brows_arch' | 'lashes_classic' | ... (здесь человекочитаемые)
  price: number
  /** Себестоимость (расходы на материалы), ₽. По умолчанию 0. */
  cost: number
  notes: string
  photos: string[]
  created_at: string
}

export type ArticleCategory = 'promotion' | 'packaging' | 'clients' | 'technique'

export interface Article {
  id: string
  title: string
  content: string // Markdown
  category: ArticleCategory
  cover_url: string | null
  is_premium: boolean
  created_at: string
  /** Dev/demo: сколько мастеров прочитали */
  readers?: number
}

/* ------------------------------------------------------------------ */
/* T10 — ОНЛАЙН-АКАДЕМИЯ: курсы → уроки                                */
/* ------------------------------------------------------------------ */

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

/** Карточка-этап схемы (шаг процесса с пояснением) */
export interface ArticleStep {
  title: string
  text?: string
  /** Эмодзи-иконка этапа */
  icon?: string
}

/** Визуальная схема урока: поток этапов (стрелки) + карточки-шаги */
export interface LessonSchema {
  /** Заголовок схемы, напр. «Воронка мастера» */
  title?: string
  /** Горизонтальный поток: Клиент → Напоминание → Визит → Возврат */
  flow?: string[]
  /** Нумерованные карточки-этапы с описанием */
  steps?: ArticleStep[]
}

/** Видео-плейсхолдер урока (демо): превью-эмодзи + длительность ролика.
 *  Структура готова под реальные видео — их зальём позже. */
export interface LessonVideo {
  /** Эмодзи-превью вместо кадра (в демо нет картинок) */
  previewEmoji: string
  /** Длительность ролика, «04:32» */
  duration: string
}

/** T11 — Практическое задание в конце урока (академия = обучение с практикой) */
export interface LessonAssignment {
  /** Что сделать — текст задания */
  task: string
  /** Подсказка/пример выполнения (опционально) */
  hint?: string
  /** Тип ответа: свободный текст или чек-лист */
  type: 'text' | 'checklist'
  /** Пункты чек-листа (для type: 'checklist') */
  items?: string[]
}

/** Урок внутри курса: видео-плейсхолдер + богатый текст + схема */
export interface Lesson {
  id: string
  title: string
  /** Время чтения/просмотра, «7 мин» */
  duration: string
  /** Богатый markdown: ## / ### / **жирный** / списки / 💡 / ⚠️ / → */
  content: string
  /** Видео-плейсхолдер (демо) */
  video?: LessonVideo
  /** Схема/этапы процесса */
  schema?: LessonSchema
  /** T11 — практическое задание в конце урока */
  assignment?: LessonAssignment
  /** Стартовый прогресс мастера (демо) */
  is_completed?: boolean
}

/** Курс академии: витрина с обложкой, уровнем и уроками */
export interface Course {
  id: string
  title: string
  /** Короткое описание для карточки-витрины */
  subtitle: string
  category: ArticleCategory
  level: CourseLevel
  /** Эмодзи-обложка курса (демо вместо картинки) */
  coverEmoji: string
  /** Акцентный цвет курса (hex) для обложки/акцентов */
  accent: string
  lessons: Lesson[]
  is_premium: boolean
  /** Dev/demo: сколько мастеров записались/прошли */
  readers?: number
  created_at: string
}

/* ---------------------------------------------------------------- */

export const currentMaster: Master = {
  id: 'm-1',
  telegram_id: 123456789,
  name: 'Анна',
  phone: '+7 999 123-45-67',
  specialty: ['Бровист', 'Лэшмейкер'],
  avatar_url: null,
  subscription_status: 'active',
  subscription_end: '2026-09-15',
  is_gaze_graduate: true,
  referral_code: 'GAZE-7K3FQ',
  referred_by: null,
  created_at: '2026-01-10T10:00:00Z',
}

export const clients: Client[] = [
  {
    id: 'c-1',
    master_id: 'm-1',
    name: 'Мария Иванова',
    phone: '+7 912 345-67-89',
    notes: 'Чувствительная кожа, аллергия на краску. Хна — только натуральная.',
    last_visit: '2026-07-05',
    total_visits: 3,
    total_spent: 8000,
    bonus_points: 120,
    created_at: '2026-03-02T12:00:00Z',
  },
  {
    id: 'c-2',
    master_id: 'm-1',
    name: 'Алина Петрова',
    phone: '+7 921 456-78-90',
    notes: 'Любит натуральный изгиб. Приходит каждые 3 недели.',
    last_visit: '2026-08-10',
    total_visits: 5,
    total_spent: 19500,
    bonus_points: 300,
    created_at: '2026-02-14T12:00:00Z',
  },
  {
    id: 'c-3',
    master_id: 'm-1',
    name: 'Екатерина Смирнова',
    phone: '+7 933 567-89-01',
    notes: 'Записывается вместе с подругой. Удобно — вечер буднего дня.',
    last_visit: '2026-08-19',
    total_visits: 2,
    total_spent: 8000,
    bonus_points: 60,
    created_at: '2026-06-20T12:00:00Z',
  },
  {
    id: 'c-4',
    master_id: 'm-1',
    name: 'Ольга Ковалёва',
    phone: '+7 944 678-90-12',
    notes: '',
    last_visit: '2026-06-01',
    total_visits: 1,
    total_spent: 2500,
    bonus_points: 0,
    created_at: '2026-05-25T12:00:00Z',
  },
]

export const procedures: Procedure[] = [
  {
    id: 'p-1',
    client_id: 'c-3',
    master_id: 'm-1',
    service_type: 'Архитектура бровей',
    price: 2500,
    cost: 600,
    notes: 'Коррекция + окрашивание хной. Форма по овалу лица.',
    photos: [],
    created_at: '2026-08-19T14:00:00Z',
  },
  {
    id: 'p-2',
    client_id: 'c-2',
    master_id: 'm-1',
    service_type: 'Ламинирование ресниц',
    price: 3500,
    cost: 900,
    notes: 'Изгиб L, эффект накрашенных.',
    photos: [],
    created_at: '2026-08-10T11:00:00Z',
  },
  {
    id: 'p-3',
    client_id: 'c-3',
    master_id: 'm-1',
    service_type: 'Комплекс GAZE',
    price: 5500,
    cost: 1400,
    notes: 'Брови + ресницы. Скидка за комплекс.',
    photos: [],
    created_at: '2026-08-05T15:00:00Z',
  },
  {
    id: 'p-4',
    client_id: 'c-2',
    master_id: 'm-1',
    service_type: 'Наращивание',
    price: 4500,
    cost: 1300,
    notes: 'Наращивание 2D, классика.',
    photos: [],
    created_at: '2026-07-15T13:00:00Z',
  },
  {
    id: 'p-5',
    client_id: 'c-1',
    master_id: 'm-1',
    service_type: 'Архитектура бровей',
    price: 2500,
    cost: 600,
    notes: '',
    photos: [],
    created_at: '2026-07-05T12:00:00Z',
  },
  {
    id: 'p-6',
    client_id: 'c-2',
    master_id: 'm-1',
    service_type: 'Ламинирование ресниц',
    price: 3500,
    cost: 900,
    notes: '',
    photos: [],
    created_at: '2026-06-20T12:00:00Z',
  },
  {
    id: 'p-7',
    client_id: 'c-4',
    master_id: 'm-1',
    service_type: 'Архитектура бровей',
    price: 2500,
    cost: 600,
    notes: 'Первый визит, знакомство.',
    photos: [],
    created_at: '2026-06-01T12:00:00Z',
  },
  {
    id: 'p-8',
    client_id: 'c-1',
    master_id: 'm-1',
    service_type: 'Ламинирование бровей',
    price: 3000,
    cost: 800,
    notes: '',
    photos: [],
    created_at: '2026-06-05T12:00:00Z',
  },
  {
    id: 'p-9',
    client_id: 'c-1',
    master_id: 'm-1',
    service_type: 'Архитектура бровей',
    price: 2500,
    cost: 600,
    notes: '',
    photos: [],
    created_at: '2026-05-25T12:00:00Z',
  },
  {
    id: 'p-10',
    client_id: 'c-2',
    master_id: 'm-1',
    service_type: 'Ламинирование ресниц',
    price: 3500,
    cost: 900,
    notes: '',
    photos: [],
    created_at: '2026-05-10T12:00:00Z',
  },
  {
    id: 'p-11',
    client_id: 'c-2',
    master_id: 'm-1',
    service_type: 'Наращивание',
    price: 4500,
    cost: 1300,
    notes: '2D, угол глаза — ярче.',
    photos: [],
    created_at: '2026-04-20T12:00:00Z',
  },
]

export const articles: Article[] = [
  {
    id: 'a-1',
    title: 'Как оформить Авито за 30 минут',
    content: '',
    category: 'promotion',
    cover_url: null,
    is_premium: false,
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'a-2',
    title: 'Фото работ на телефон: 5 правил',
    content: '',
    category: 'packaging',
    cover_url: null,
    is_premium: false,
    created_at: '2026-07-05T10:00:00Z',
  },
  {
    id: 'a-3',
    title: 'Скрипты ответов клиентам',
    content: '',
    category: 'clients',
    cover_url: null,
    is_premium: false,
    created_at: '2026-07-10T10:00:00Z',
  },
  {
    id: 'a-4',
    title: 'Работа с асимметрией: пошаговый разбор',
    content: '',
    category: 'technique',
    cover_url: null,
    is_premium: false,
    created_at: '2026-07-15T10:00:00Z',
  },
  {
    id: 'a-5',
    title: 'Как поднять средний чек без потери клиентов',
    content: '',
    category: 'promotion',
    cover_url: null,
    is_premium: true,
    created_at: '2026-07-20T10:00:00Z',
  },
  {
    id: 'a-6',
    title: 'Промпты для нейросетей: готовые запросы',
    content: '',
    category: 'packaging',
    cover_url: null,
    is_premium: false,
    created_at: '2026-07-25T10:00:00Z',
  },
]

/* ---------- Хелперы выборок (на этапе 2 заменятся на Supabase-запросы) ---------- */

export function getClientById(id: string): Client | undefined {
  return clients.find((c) => c.id === id)
}

export function getClientProcedures(clientId: string): Procedure[] {
  return procedures
    .filter((p) => p.client_id === clientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function getClientName(clientId: string): string {
  return getClientById(clientId)?.name ?? 'Клиент'
}

/** Доход за текущий месяц (из процедур) */
export function monthIncome(month: Date = new Date()): number {
  const ym = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  return procedures
    .filter((p) => p.created_at.startsWith(ym))
    .reduce((sum, p) => sum + p.price, 0)
}

export function averageCheck(): number {
  if (procedures.length === 0) return 0
  const total = procedures.reduce((sum, p) => sum + p.price, 0)
  return Math.round(total / procedures.length)
}

/** Процедуры, отсортированные по дате (свежие сверху) — для «Недавних визитов» */
export function recentProcedures(limit = 5): Procedure[] {
  return [...procedures]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

