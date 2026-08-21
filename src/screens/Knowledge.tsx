import { useState } from 'react'
import { Lock } from 'lucide-react'
import Badge from '../components/Badge'
import Card from '../components/Card'
import ErrorState from '../components/ErrorState'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { fetchArticles } from '../lib/api'
import type { Article, ArticleCategory } from '../lib/mock'
import { haptic } from '../lib/telegram'
import { cx, formatDate } from '../lib/utils'
import styles from './Knowledge.module.css'

type CategoryFilter = 'all' | ArticleCategory

const CATEGORIES: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'promotion', label: 'Продвижение' },
  { id: 'packaging', label: 'Упаковка' },
  { id: 'clients', label: 'Клиенты' },
  { id: 'technique', label: 'Техника' },
]

const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  promotion: 'Продвижение',
  packaging: 'Упаковка',
  clients: 'Клиенты',
  technique: 'Техника',
}

export default function Knowledge() {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const state = useAsync(() => fetchArticles(), [attempt])

  const articles = state.data ?? []

  const filtered: Article[] =
    filter === 'all' ? articles : articles.filter((a) => a.category === filter)

  const toggle = (id: string) => {
    haptic('light')
    setExpandedId((prev) => (prev === id ? null : id))
  }

  /* Загрузка */
  if (state.status === 'loading') {
    return (
      <div className={styles.screen}>
        <SkeletonLoader shape="title" width={180} height={28} />
        <div className={styles.filters}>
          <SkeletonLoader shape="button" width={70} height={36} />
          <SkeletonLoader shape="button" width={110} height={36} />
          <SkeletonLoader shape="button" width={90} height={36} />
          <SkeletonLoader shape="button" width={90} height={36} />
          <SkeletonLoader shape="button" width={80} height={36} />
        </div>
        <SkeletonLoader shape="card" height={96} />
        <SkeletonLoader shape="card" height={96} />
        <SkeletonLoader shape="card" height={96} />
      </div>
    )
  }

  /* Ошибка */
  if (state.status === 'error') {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>База знаний</h1>
        <ErrorState message={state.error ?? ''} onRetry={() => setAttempt((a) => a + 1)} />
      </div>
    )
  }

  /* Пустое состояние */
  if (articles.length === 0) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>База знаний</h1>
        <Card className={styles.emptyCard}>
          <p className={styles.emptyTitle}>Пока нет статей.</p>
          <p className={styles.emptyText}>Материалы появятся здесь — следи за обновлениями.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>База знаний</h1>

      {/* Категории: pill-табы */}
      <div className={styles.filters}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={cx(styles.filterBtn, filter === c.id && styles.filterActive)}
            onClick={() => {
              haptic('light')
              setFilter(c.id)
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Статьи */}
      {filtered.length > 0 ? (
        <div className={cx('stagger', styles.list)}>
          {filtered.map((article) => {
            const expanded = expandedId === article.id
            return (
              <Card key={article.id} className={styles.article} onClick={() => toggle(article.id)}>
                <div className={styles.articleTop}>
                  <Badge variant="accent">
                    {CATEGORY_LABEL[article.category] ?? article.category}
                  </Badge>
                  {article.is_premium && (
                    <Badge variant="cta">
                      <Lock size={10} strokeWidth={2.5} />
                      PREMIUM
                    </Badge>
                  )}
                </div>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                {expanded && article.content && (
                  <p className={styles.articleContent}>{article.content}</p>
                )}
                <div className={styles.articleBottom}>
                  <span className={styles.articleDate}>
                    {formatDate(article.created_at.slice(0, 10))}
                  </span>
                  <span className={cx(styles.articleToggle, expanded && styles.articleToggleOpen)}>
                    {article.content ? (expanded ? 'Свернуть' : 'Читать') : 'Скоро'}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className={styles.emptyCard}>
          <p className={styles.emptyText}>В этой категории пока нет статей.</p>
        </Card>
      )}
    </div>
  )
}
