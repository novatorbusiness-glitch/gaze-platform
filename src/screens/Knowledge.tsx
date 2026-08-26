import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock,
  Flame,
  Lock,
  Megaphone,
  Package,
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
import { fetchArticles } from '../lib/api'
import { demoArticles } from '../lib/dev-data'
import type { Article, ArticleCategory } from '../lib/mock'
import { haptic } from '../lib/telegram'
import { cx, formatDate } from '../lib/utils'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Knowledge.module.css'

type CategoryFilter = 'all' | ArticleCategory

const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  promotion: 'Продвижение',
  packaging: 'Упаковка',
  clients: 'Клиенты',
  technique: 'Техника',
}

interface CategoryMeta {
  id: ArticleCategory
  label: string
  hint: string
  icon: LucideIcon
}

/** Плитки-категории: иконка, подсказка, акцент-цвет задаётся в CSS (--cat-*) */
const CATEGORIES: CategoryMeta[] = [
  { id: 'promotion', label: 'Продвижение', hint: 'Авито, соцсети, запуск', icon: Megaphone },
  { id: 'packaging', label: 'Упаковка', hint: 'Фото, профиль, прайс', icon: Package },
  { id: 'clients', label: 'Клиенты', hint: 'Скрипты, возврат, сервис', icon: Users },
  { id: 'technique', label: 'Техника', hint: 'Брови, ресницы, лайфхаки', icon: Zap },
]

const CATEGORY_PREVIEW: Record<ArticleCategory, string> = {
  promotion: 'Как приводить клиентов и расти без вложений в рекламу.',
  packaging: 'Упаковка, которая продаёт ещё до первой записи.',
  clients: 'Скрипты, возврат и сервис, за который возвращаются.',
  technique: 'Рабочие приёмы и лайфхаки для твоего ремесла.',
}

/**
 * Заглушки «Скоро» — визуальное наполнение хаба (пока нет полных статей).
 * Отображаются в списке с бейджем «Скоро», без контента.
 */
const STUBS: Article[] = [
  {
    id: 'stub-1',
    title: 'Скоро: чек-лист «Идеальное рабочее место мастера»',
    content: '',
    category: 'technique',
    cover_url: null,
    is_premium: false,
    created_at: '2026-08-22T10:00:00Z',
  },
  {
    id: 'stub-2',
    title: 'Скоро: шаблоны сторис для продвижения',
    content: '',
    category: 'promotion',
    cover_url: null,
    is_premium: false,
    created_at: '2026-08-24T10:00:00Z',
  },
]

/** Примерное время чтения: ~180 слов в минуту, минимум 1 минута */
function readMinutes(content: string): number {
  if (!content) return 0
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 180))
}

/** Превью статьи: первые ~140 символов текста без markdown-разметки */
function previewOf(article: Article): string {
  if (article.content) {
    const plain = article.content.replace(/[#*`>→-]/g, ' ').replace(/\s+/g, ' ').trim()
    return plain.length > 140 ? `${plain.slice(0, 140)}…` : plain
  }
  return CATEGORY_PREVIEW[article.category]
}

/** Лёгкая очистка markdown-разметки для отображения (заголовки ##, **жирный**, *курсив*) */
function formatContent(content: string): string {
  return content
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1'),
    )
    .join('\n')
}

export default function Knowledge() {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  const isDemo = useMasterStore((s) => s.isDemo)

  const state = useAsync(() => fetchArticles(), [attempt])

  // В демо-режиме при падении запроса отдаём демо-статьи (RLS-ошибку не показываем)
  const fetched = isDemo && state.status === 'error' ? demoArticles : state.data ?? []

  // Полный набор: статьи + заглушки «Скоро» (без дублей)
  const articles = useMemo(() => {
    const ids = new Set(fetched.map((a) => a.id))
    return [...fetched, ...STUBS.filter((s) => !ids.has(s.id))]
  }, [fetched])

  const countFor = useMemo(() => {
    const map: Record<ArticleCategory, number> = { promotion: 0, packaging: 0, clients: 0, technique: 0 }
    for (const a of articles) if (a.category in map) map[a.category] += 1
    return map
  }, [articles])

  /** Популярное — топ по читателям (блок виден только на «Всех» без поиска) */
  const popular = useMemo(
    () => [...fetched].sort((a, b) => (b.readers ?? 0) - (a.readers ?? 0)).slice(0, 3),
    [fetched],
  )
  const showPopular = filter === 'all' && query.trim() === '' && popular.length > 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((a) => {
      const matchCat = filter === 'all' || a.category === filter
      const matchQ =
        !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [articles, filter, query])

  const toggle = (id: string) => {
    haptic('light')
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const pickCategory = (id: ArticleCategory) => {
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
        <SkeletonLoader shape="card" height={96} />
        <SkeletonLoader shape="card" height={96} />
      </div>
    )
  }

  /* Ошибка. В демо-режиме не показываем (демо-статьи уже отданы) */
  if (state.status === 'error' && !isDemo) {
    return (
      <div className={styles.screen}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>База знаний</h1>
          <p className={styles.heroSub}>Расти с GAZE — практика, фишки, шаблоны</p>
        </div>
        <ErrorState message={state.error ?? ''} onRetry={() => setAttempt((a) => a + 1)} />
      </div>
    )
  }

  /* Пустое состояние */
  if (articles.length === 0) {
    return (
      <div className={styles.screen}>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>База знаний</h1>
          <p className={styles.heroSub}>Расти с GAZE — практика, фишки, шаблоны</p>
        </div>
        <Card className={styles.emptyCard}>
          <BookOpen size={28} strokeWidth={1.5} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Пока нет статей.</p>
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
        <h1 className={styles.heroTitle}>База знаний</h1>
        <p className={styles.heroSub}>Расти с GAZE — практика, фишки, шаблоны</p>

        <div className={styles.searchWrap}>
          <Search size={17} strokeWidth={2} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Найти статью…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (expandedId) setExpandedId(null)
            }}
            aria-label="Поиск по статьям"
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

      {/* Категории — большие карточки-плитки */}
      <section aria-label="Категории" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Категории</h2>
          <span className={styles.sectionMeta}>{articles.length} материалов</span>
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

      {/* Свежие / Популярное */}
      {showPopular && (
        <section aria-label="Популярное" className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Flame size={16} strokeWidth={2.2} className={styles.sectionTitleIcon} />
              Популярное
            </h2>
            <span className={styles.sectionMeta}>читают чаще всего</span>
          </div>
          <div className={cx('stagger', styles.popularList)}>
            {popular.map((article) => {
              const Icon = article.is_premium ? Lock : ArrowRight
              return (
                <button
                  key={article.id}
                  className={cx(styles.popularCard, styles[`pop${article.category[0].toUpperCase()}${article.category.slice(1)}`])}
                  onClick={() => toggle(article.id)}
                >
                  <span className={styles.popularTop}>
                    <Badge variant="accent">{CATEGORY_LABEL[article.category]}</Badge>
                    {article.readers ? (
                      <span className={styles.popularReaders}>
                        <Flame size={11} strokeWidth={2.4} />
                        {article.readers}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.popularTitle}>{article.title}</span>
                  <span className={styles.popularMeta}>
                    <span>{readMinutes(article.content) ? `${readMinutes(article.content)} мин чтения` : 'Скоро'}</span>
                    <Icon size={16} strokeWidth={2} className={styles.popularArrow} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Список статей */}
      <section ref={listRef} aria-label="Статьи" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {filter === 'all' ? 'Все статьи' : CATEGORY_LABEL[filter]}
          </h2>
          <span className={styles.sectionMeta}>{filtered.length}</span>
        </div>

        {filtered.length > 0 ? (
          <div className={cx('stagger', styles.list)}>
            {filtered.map((article) => {
              const expanded = expandedId === article.id
              const mins = readMinutes(article.content)
              return (
                <Card key={article.id} className={styles.article} onClick={() => toggle(article.id)}>
                  <div className={styles.articleTop}>
                    <Badge variant="accent">{CATEGORY_LABEL[article.category]}</Badge>
                    {article.is_premium && (
                      <Badge variant="cta">
                        <Lock size={10} strokeWidth={2.5} />
                        PREMIUM
                      </Badge>
                    )}
                  </div>
                  <h3 className={styles.articleTitle}>{article.title}</h3>
                  <p className={styles.articlePreview}>{previewOf(article)}</p>
                  {expanded && article.content && (
                    <div className={styles.articleBody}>
                      <p className={styles.articleContent}>{formatContent(article.content)}</p>
                    </div>
                  )}
                  <div className={styles.articleBottom}>
                    <span className={styles.articleMeta}>
                      <Clock size={12} strokeWidth={2} />
                      {mins ? `${mins} мин` : 'Скоро'}
                      <span className={styles.articleDot}>·</span>
                      {formatDate(article.created_at.slice(0, 10))}
                    </span>
                    <span className={cx(styles.articleToggle, expanded && styles.articleToggleOpen)}>
                      {article.content ? (expanded ? 'Свернуть' : 'Читать') : 'Скоро'}
                      <ChevronDown size={14} strokeWidth={2.2} className={cx(styles.chevron, expanded && styles.chevronOpen)} />
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
              {query ? 'По запросу ничего не нашлось. Попробуй другое слово.' : 'В этой категории пока нет статей.'}
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
