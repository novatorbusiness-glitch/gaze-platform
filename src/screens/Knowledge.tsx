import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ArrowRight,
  BookOpen,
  Flame,
  GraduationCap,
  Lock,
  Megaphone,
  Package,
  PlayCircle,
  Search,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Badge from '../components/Badge'
import Card from '../components/Card'
import ErrorState from '../components/ErrorState'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { fetchCourses } from '../lib/api'
import { demoCourses } from '../lib/dev-data'
import type { Course } from '../lib/mock'
import { haptic } from '../lib/telegram'
import { cx } from '../lib/utils'
import { getCurrentLevel, getPathLevel } from '../lib/path'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Knowledge.module.css'

type CategoryFilter = 'all' | Course['category']

const CATEGORY_LABEL: Record<Course['category'], string> = {
  promotion: 'Продвижение',
  packaging: 'Упаковка',
  clients: 'Клиенты',
  technique: 'Техника',
}

const LEVEL_LABEL: Record<Course['level'], string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

interface CategoryMeta {
  id: Course['category']
  label: string
  hint: string
  icon: LucideIcon
}

/** Плитки-категории: иконка, подсказка, акцент-цвет задаётся в CSS (--cat-*) */
const CATEGORIES: CategoryMeta[] = [
  { id: 'promotion', label: 'Продвижение', hint: 'Авито, соцсети, запуск', icon: Megaphone },
  { id: 'packaging', label: 'Упаковка', hint: 'Фото, профиль, прайс', icon: Package },
  { id: 'clients', label: 'Клиенты', hint: 'Скрипты, возврат, сервис', icon: Users },
  { id: 'technique', label: 'Техника', hint: 'Приёмы, лайфхаки, мастерство', icon: Zap },
]

/** Заглушки «Скоро» — визуальное наполнение витрины (новые курсы в разработке) */
const STUBS: Course[] = [
  {
    id: 'stub-1',
    title: 'Скоро: Идеальное рабочее место',
    subtitle: 'Чек-лист организации рабочего пространства мастера',
    category: 'technique',
    level: 'beginner',
    coverEmoji: '🪞',
    accent: '#8b7b5f',
    lessons: [],
    is_premium: false,
    created_at: '2026-08-22T10:00:00Z',
  },
  {
    id: 'stub-2',
    title: 'Скоро: Сторис для продвижения',
    subtitle: 'Шаблоны сторис, которые продают',
    category: 'promotion',
    level: 'beginner',
    coverEmoji: '📱',
    accent: '#b07a5a',
    lessons: [],
    is_premium: false,
    created_at: '2026-08-24T10:00:00Z',
  },
]

/** Общая длительность курса, «34 мин» */
function totalMinutes(course: Course): number {
  const mins = course.lessons.reduce((acc, l) => acc + (parseInt(l.duration, 10) || 0), 0)
  return mins
}

export default function Knowledge() {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  const isDemo = useMasterStore((s) => s.isDemo)
  const openCourse = useAppStore((s) => s.openCourse)
  const completedLessons = useAppStore((s) => s.completedLessons)
  // G1b — «Путь роста»: открывается из Академии
  const openPath = useAppStore((s) => s.openPath)
  // G3 — «3 рычага роста»: стартовый блок обучения, открывается из Академии
  const openGrowth = useAppStore((s) => s.openGrowth)
  const currentLevel = getCurrentLevel()
  const currentPathLevel = getPathLevel(currentLevel)
  // G2 — премиум-курсы: на базовом тарифе закрыты замком, ведут на «Премиум»
  const plan = useAppStore((s) => s.plan)
  const navigate = useAppStore((s) => s.navigate)
  const isPremium = plan === 'premium'

  /** G2 — Открыть курс: премиум-курс на базовом тарифе → экран «Премиум» */
  const onOpenCourse = (course: Course) => {
    haptic('light')
    if (course.is_premium && !isPremium) {
      navigate('premium')
      return
    }
    openCourse(course.id)
  }

  const state = useAsync(() => fetchCourses(), [attempt])

  // В демо-режиме при падении запроса отдаём демо-курсы (RLS-ошибку не показываем)
  const fetched = isDemo && state.status === 'error' ? demoCourses : state.data ?? []

  // Полный набор: курсы + заглушки «Скоро» (без дублей)
  const courses = useMemo(() => {
    const ids = new Set(fetched.map((c) => c.id))
    return [...fetched, ...STUBS.filter((s) => !ids.has(s.id))]
  }, [fetched])

  const countFor = useMemo(() => {
    const map: Record<Course['category'], number> = { promotion: 0, packaging: 0, clients: 0, technique: 0 }
    for (const c of courses) if (c.category in map) map[c.category] += 1
    return map
  }, [courses])

  /** Популярное — топ по читателям (блок виден только на «Всех» без поиска) */
  const popular = useMemo(
    () => [...fetched].sort((a, b) => (b.readers ?? 0) - (a.readers ?? 0)).slice(0, 3),
    [fetched],
  )
  const showPopular = filter === 'all' && query.trim() === '' && popular.length > 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((c) => {
      const matchCat = filter === 'all' || c.category === filter
      const matchQ =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.lessons.some((l) => l.title.toLowerCase().includes(q))
      return matchCat && matchQ
    })
  }, [courses, filter, query])

  const pickCategory = (id: Course['category']) => {
    haptic('light')
    setFilter((prev) => (prev === id ? 'all' : id))
    setQuery('')
    requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  /* Загрузка */
  if (state.status === 'loading') {
    return (
      <div className={styles.screen}>
        <SkeletonLoader shape="card" height={120} />
        <SkeletonLoader shape="title" width={140} height={20} />
        <div className={styles.tiles}>
          <SkeletonLoader shape="card" height={92} />
          <SkeletonLoader shape="card" height={92} />
          <SkeletonLoader shape="card" height={92} />
          <SkeletonLoader shape="card" height={92} />
        </div>
        <SkeletonLoader shape="title" width={120} height={20} />
        <SkeletonLoader shape="card" height={132} />
        <SkeletonLoader shape="card" height={132} />
      </div>
    )
  }

  /* Ошибка. В демо-режиме не показываем (демо-курсы уже отданы) */
  if (state.status === 'error' && !isDemo) {
    return (
      <div className={styles.screen}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Академия</h1>
          <p className={styles.heroSub}>Расти с GAZE — курсы, гиды, практика</p>
        </div>
        <ErrorState message={state.error ?? ''} onRetry={() => setAttempt((a) => a + 1)} />
      </div>
    )
  }

  /* Пустое состояние */
  if (courses.length === 0) {
    return (
      <div className={styles.screen}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Академия</h1>
          <p className={styles.heroSub}>Расти с GAZE — курсы, гиды, практика</p>
        </div>
        <Card className={styles.emptyCard}>
          <BookOpen size={28} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Пока нет курсов.</p>
          <p className={styles.emptyText}>Материалы появятся здесь — следи за обновлениями.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {/* Герой: заголовок + подзаголовок + поиск */}
      <div className={cx('stagger', styles.hero)}>
        <div className={styles.heroRow}>
          <span className={styles.heroKicker}>
            <Sparkles size={12} strokeWidth={2.5} />
            GAZE АКАДЕМИЯ
          </span>
          {isDemo && <Badge variant="demo">DEMO</Badge>}
        </div>
        <h1 className={styles.heroTitle}>Академия</h1>
        <p className={styles.heroSub}>Курсы и гиды для роста мастера — понятно, богато, по шагам</p>

        <div className={styles.searchWrap}>
          <Search size={17} strokeWidth={2} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Найти курс или урок…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поиск по курсам"
          />
          {query && (
            <button
              className={styles.searchClear}
              onClick={() => {
                haptic('light')
                setQuery('')
              }}
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* G3 — «3 рычага роста»: CTA-карточка со стартом обучения */}
      <button
        className={styles.growthCta}
        onClick={() => {
          haptic('medium')
          openGrowth()
        }}
      >
        <span className={styles.growthCtaEmoji}>🧮</span>
        <span className={styles.growthCtaBody}>
          <span className={styles.growthCtaKicker}>Клиенты × Чек × Возвраты</span>
          <span className={styles.growthCtaTitle}>3 рычага роста мастера</span>
          <span className={styles.growthCtaSub}>Старт: пойми, из чего складывается твой доход</span>
        </span>
        <span className={styles.growthCtaArrow}>
          <ArrowRight size={16} strokeWidth={2.2} />
        </span>
      </button>

      {/* G1b — «Путь роста»: CTA-карточка с текущим уровнем */}
      <button
        className={styles.pathCta}
        onClick={() => {
          haptic('medium')
          openPath('knowledge')
        }}
      >
        <span className={styles.pathCtaEmoji}>{currentPathLevel.emoji}</span>
        <span className={styles.pathCtaBody}>
          <span className={styles.pathCtaKicker}>GAZE PATH</span>
          <span className={styles.pathCtaTitle}>Путь роста · 6 уровней до 200к+</span>
          <span className={styles.pathCtaSub}>
            Уровень {currentLevel} · {currentPathLevel.name} — система сама ведёт тебя вперёд
          </span>
        </span>
        <span className={styles.pathCtaArrow}>
          <ArrowRight size={16} strokeWidth={2.2} />
        </span>
      </button>

      {/* Категории — большие карточки-плитки */}
      <section aria-label="Категории" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Категории</h2>
          <span className={styles.sectionMeta}>{courses.length} курсов</span>
        </div>
        <div className={cx('stagger', styles.tiles)}>
          {CATEGORIES.map((cat) => {
            const active = filter === cat.id
            const Icon = cat.icon
            const count = countFor[cat.id]
            return (
              <button
                key={cat.id}
                className={cx(styles.tile, active && styles.tileActive, styles[`tile${cat.id[0].toUpperCase()}${cat.id.slice(1)}`])}
                onClick={() => pickCategory(cat.id)}
                aria-pressed={active}
              >
                <span className={styles.tileIcon}>
                  <Icon size={20} strokeWidth={2} />
                </span>
                <span className={styles.tileText}>
                  <span className={styles.tileLabel}>{cat.label}</span>
                  <span className={styles.tileHint}>{cat.hint}</span>
                </span>
                <span className={styles.tileCount}>{count}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Популярное */}
      {showPopular && (
        <section aria-label="Популярное" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Flame size={16} strokeWidth={2.2} className={styles.sectionTitleIcon} />
              Популярное
            </h2>
            <span className={styles.sectionMeta}>проходят чаще всего</span>
          </div>
          <div className={cx('stagger', styles.popularList)}>
            {popular.map((course) => {
              const done = course.lessons.filter((l) => completedLessons[l.id]).length
              const started = done > 0
              return (
                <button
                  key={course.id}
                  className={styles.popularCard}
                  style={{ '--pop-accent': course.accent } as CSSProperties}
                  onClick={() => onOpenCourse(course)}
                >
                  <span className={styles.popularTop}>
                    <span className={styles.popularEmoji}>{course.coverEmoji}</span>
                    <span className={styles.popularTags}>
                      <Badge variant="accent">{CATEGORY_LABEL[course.category]}</Badge>
                      {course.is_premium && (
                        <Badge variant="cta">
                          <Lock size={10} strokeWidth={2.5} />
                          PREMIUM
                        </Badge>
                      )}
                    </span>
                  </span>
                  <span className={styles.popularTitle}>{course.title}</span>
                  <span className={styles.popularMeta}>
                    <span className={styles.popularMetaLeft}>
                      {started ? (
                        <>
                          <Flame size={12} strokeWidth={2.4} className={styles.popularReaders} />
                          {done}/{course.lessons.length} уроков
                        </>
                      ) : (
                        <>
                          <PlayCircle size={12} strokeWidth={2.2} />
                          {course.lessons.length} уроков · {totalMinutes(course)} мин
                        </>
                      )}
                    </span>
                    <ArrowRight size={16} strokeWidth={2} className={styles.popularArrow} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Список курсов */}
      <section ref={listRef} aria-label="Курсы" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {filter === 'all' ? 'Все курсы' : CATEGORY_LABEL[filter]}
          </h2>
          <span className={styles.sectionMeta}>{filtered.length}</span>
        </div>

        {filtered.length > 0 ? (
          <div className={cx('stagger', styles.list)}>
            {filtered.map((course) => {
              const done = course.lessons.filter((l) => completedLessons[l.id]).length
              const pct = course.lessons.length > 0 ? Math.round((done / course.lessons.length) * 100) : 0
              const started = done > 0
              return (
                <Card
                  key={course.id}
                  className={styles.course}
                  onClick={() => onOpenCourse(course)}
                >
                  <div className={styles.courseCover} style={{ '--course-accent': course.accent } as CSSProperties}>
                    <span className={styles.courseEmoji}>{course.coverEmoji}</span>
                    <div className={styles.courseTags}>
                      <Badge variant="accent">{CATEGORY_LABEL[course.category]}</Badge>
                      {course.is_premium && (
                        <Badge variant="cta">
                          <Lock size={10} strokeWidth={2.5} />
                          PREMIUM
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={styles.courseBody}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <p className={styles.courseSub}>{course.subtitle}</p>
                    <div className={styles.courseMeta}>
                      <span className={styles.courseMetaItem}>
                        <GraduationCap size={13} strokeWidth={2} />
                        {LEVEL_LABEL[course.level]}
                      </span>
                      <span className={styles.courseMetaItem}>
                        <PlayCircle size={13} strokeWidth={2} />
                        {course.lessons.length > 0 ? `${course.lessons.length} уроков · ${totalMinutes(course)} мин` : 'Скоро'}
                      </span>
                      {course.readers ? (
                        <span className={styles.courseMetaItem}>
                          <Flame size={13} strokeWidth={2} />
                          {course.readers}
                        </span>
                      ) : null}
                    </div>
                    {started && (
                      <div className={styles.courseProgress}>
                        <span className={styles.courseProgressText}>
                          {done} из {course.lessons.length} уроков · {pct}%
                        </span>
                        <span className={styles.courseProgressTrack}>
                          <span className={styles.courseProgressFill} style={{ width: `${pct}%` }} />
                        </span>
                      </div>
                    )}
                    <span className={styles.courseCta}>
                      {course.is_premium && !isPremium ? (
                        <>
                          <Lock size={14} strokeWidth={2.4} />
                          Доступно в Премиум
                        </>
                      ) : started ? (
                        'Продолжить'
                      ) : course.lessons.length > 0 ? (
                        'Открыть курс'
                      ) : (
                        'Скоро'
                      )}
                      <ArrowRight size={15} strokeWidth={2.2} />
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className={styles.emptyCard}>
            <Search size={26} strokeWidth={1.5} className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              {query ? 'По запросу ничего не нашлось. Попробуй другое слово.' : 'В этой категории пока нет курсов.'}
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
