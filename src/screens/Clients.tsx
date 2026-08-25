import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ClientRow from '../components/ClientRow'
import ErrorState from '../components/ErrorState'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { fetchClients } from '../lib/api'
import { demoClients } from '../lib/dev-data'
import { haptic } from '../lib/telegram'
import { cx, daysSince, formatDate, formatMoney } from '../lib/utils'
import { useAppStore, type ClientFilter } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Clients.module.css'

const FILTERS: Array<{ id: ClientFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'stale', label: 'Давно не был' },
]

export default function Clients() {
  const navigate = useAppStore((s) => s.navigate)
  const openClient = useAppStore((s) => s.openClient)
  const pendingClientsFilter = useAppStore((s) => s.pendingClientsFilter)
  const consumeClientsFilter = useAppStore((s) => s.consumeClientsFilter)

  const master = useMasterStore((s) => s.master)
  const masterStatus = useMasterStore((s) => s.status)
  const masterError = useMasterStore((s) => s.error)
  const isDemo = useMasterStore((s) => s.isDemo)
  const retryMaster = useMasterStore((s) => s.init)

  const masterId = master?.id ?? null
  const [attempt, setAttempt] = useState(0)

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')

  // Внешний фильтр (например, «Посмотреть список» из карточки-рекомендации в Аналитике)
  useEffect(() => {
    if (pendingClientsFilter) {
      setFilter(pendingClientsFilter)
      consumeClientsFilter()
    }
  }, [pendingClientsFilter, consumeClientsFilter])

  const state = useAsync(
    () => (masterId ? fetchClients(masterId) : Promise.resolve([])),
    [masterId, attempt],
  )

  // В демо-режиме при падении запроса отдаём демо-клиентов (RLS-ошибку не показываем)
  const clients = useMemo(
    () => (isDemo && state.status === 'error' ? demoClients : state.data ?? []),
    [state.data, state.status, isDemo],
  )

  // Поиск с debounce 200ms (ТЗ, экран Clients)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().toLowerCase()), 200)
    return () => clearTimeout(timer)
  }, [query])

  const hasStale = useMemo(() => clients.some((c) => daysSince(c.last_visit) >= 30), [clients])

  const filtered = useMemo(() => {
    return clients
      .filter((c) => {
        if (!debounced) return true
        return (
          c.name.toLowerCase().includes(debounced) || c.phone.replace(/[\s-]/g, '').includes(debounced)
        )
      })
      .filter((c) => {
        if (filter === 'active') return daysSince(c.last_visit) < 30
        if (filter === 'stale') return daysSince(c.last_visit) >= 30
        return true
      })
      .sort((a, b) => b.last_visit.localeCompare(a.last_visit))
  }, [clients, debounced, filter])

  const loading = masterStatus === 'loading' || (masterStatus === 'ready' && state.status === 'loading')
  const error = masterStatus === 'error' ? masterError : state.status === 'error' ? state.error : null

  const retry = () => {
    if (masterStatus === 'error') {
      retryMaster(true)
    } else {
      setAttempt((a) => a + 1)
    }
  }

  /* Загрузка */
  if (loading) {
    return (
      <div className={styles.screen}>
        <SkeletonLoader shape="title" width={200} height={28} />
        <SkeletonLoader shape="card" height={48} />
        <div className={styles.filters}>
          <SkeletonLoader shape="button" width={70} height={36} />
          <SkeletonLoader shape="button" width={90} height={36} />
          <SkeletonLoader shape="button" width={110} height={36} />
        </div>
        <SkeletonLoader shape="card" height={64} />
        <SkeletonLoader shape="card" height={64} />
        <SkeletonLoader shape="card" height={64} />
        <SkeletonLoader shape="card" height={64} />
      </div>
    )
  }

  /* Ошибка. В демо-режиме не показываем (демо-клиенты уже отданы) */
  if (error && !isDemo) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>Мои клиенты</h1>
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  /* Пустое состояние (новый мастер) */
  if (clients.length === 0) {
    return (
      <div className={styles.screen}>
        <h1 className={styles.title}>Мои клиенты</h1>
        <Card className={styles.emptyCard}>
          <p className={styles.emptyTitle}>Пока нет клиентов.</p>
          <p className={styles.emptyText}>Добавь первого — и платформа начнёт считать за тебя.</p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              haptic('medium')
              navigate('addClient')
            }}
          >
            + Добавить клиента
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          Мои клиенты · <span className={styles.count}>{clients.length} чел.</span>
        </h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>

      {/* Поиск с иконкой лупы */}
      <label className={styles.search}>
        <Search size={18} strokeWidth={1.5} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Найти по имени или телефону..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {/* Сортировка: pill-табы */}
      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={cx(styles.filterBtn, filter === f.id && styles.filterActive)}
            onClick={() => {
              haptic('light')
              setFilter(f.id)
            }}
          >
            {f.label}
            {f.id === 'stale' && hasStale && <span className={styles.staleDot} />}
          </button>
        ))}
      </div>

      {/* Список клиентов */}
      {filtered.length > 0 ? (
        <div className={cx('stagger', styles.list)}>
          {filtered.map((client, index) => (
            <ClientRow
              key={client.id}
              name={client.name}
              date={`Последний визит: ${formatDate(client.last_visit)}`}
              amount={client.total_spent}
              subtitle={formatMoney(client.total_spent)}
              altAvatar={index % 2 === 1}
              onClick={() => openClient(client.id)}
            />
          ))}
        </div>
      ) : (
        <Card className={styles.emptySearch}>
          <p className={styles.emptyText}>
            Никого не нашли по запросу «{query.trim()}». Проверь имя или номер телефона.
          </p>
        </Card>
      )}

      {/* FAB: круг --app-cta, белая иконка + */}
      <button
        className={styles.fab}
        aria-label="Добавить клиента"
        onClick={() => {
          haptic('light')
          navigate('addClient')
        }}
      >
        <Plus size={26} strokeWidth={2} />
      </button>
    </div>
  )
}
