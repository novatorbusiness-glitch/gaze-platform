import { useState } from 'react'
import { ArrowLeft, Copy, Percent, Plus, Send } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorState from '../components/ErrorState'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { useCountUp } from '../hooks/useCountUp'
import { fetchClientProfile, type Bonus } from '../lib/api'
import { copyText, haptic } from '../lib/telegram'
import { cx, daysSince, formatDate, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './ClientProfile.module.css'

const STALE_DAYS = 30

interface ClientProfileProps {
  /** Опционально: ID клиента. По умолчанию — из навигационного стора. */
  clientId?: string
}

export default function ClientProfile({ clientId }: ClientProfileProps) {
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const goBack = useAppStore((s) => s.goBack)
  const openAddProcedure = useAppStore((s) => s.openAddProcedure)
  const navigate = useAppStore((s) => s.navigate)

  const master = useMasterStore((s) => s.master)
  const masterStatus = useMasterStore((s) => s.status)
  const masterError = useMasterStore((s) => s.error)
  const isDemo = useMasterStore((s) => s.isDemo)
  const retryMaster = useMasterStore((s) => s.init)

  const id = clientId ?? selectedClientId ?? ''
  const masterId = master?.id ?? null

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const state = useAsync(
    () =>
      id && masterId
        ? fetchClientProfile(id, masterId)
        : Promise.resolve({ client: null, history: [], bonuses: [] }),
    [id, masterId, attempt],
  )

  const client = state.data?.client ?? null
  const history = state.data?.history ?? []
  const bonuses = state.data?.bonuses ?? []

  // Бонусы клиента: персональные (client_id) + общие для мастера (client_id = null)
  const clientBonuses: Bonus[] = bonuses.filter((b) => !b.client_id || b.client_id === id)

  const daysAway = client ? daysSince(client.last_visit) : 0
  const isActive = daysAway < STALE_DAYS
  const isLoyal = client ? client.total_visits >= 5 : false
  const avgCheck =
    client && client.total_visits > 0 ? Math.round(client.total_spent / client.total_visits) : 0

  const visits = useCountUp(client ? client.total_visits : 0)
  const spent = useCountUp(client ? client.total_spent : 0)
  const avg = useCountUp(avgCheck)

  const loading = masterStatus === 'loading' || (masterStatus === 'ready' && state.status === 'loading')
  const error = masterStatus === 'error' ? masterError : state.status === 'error' ? state.error : null

  const retry = () => {
    if (masterStatus === 'error') {
      retryMaster(true)
    } else {
      setAttempt((a) => a + 1)
    }
  }

  const onCopyPhone = async () => {
    if (!client) return
    await copyText(client.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  /* Загрузка */
  if (loading) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <SkeletonLoader shape="button" width={36} height={36} />
          <SkeletonLoader shape="title" width={180} height={24} />
        </header>
        <SkeletonLoader shape="card" height={190} />
        <SkeletonLoader shape="title" width={150} height={20} />
        <SkeletonLoader shape="card" height={72} />
        <SkeletonLoader shape="card" height={72} />
        <SkeletonLoader shape="card" height={72} />
      </div>
    )
  }

  /* Ошибка. В демо-режиме не показываем (демо-данные уже отданы) */
  if (error && !isDemo) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            aria-label="Назад"
            onClick={() => {
              haptic('light')
              goBack()
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <h1 className={styles.headerTitle}>Профиль клиента</h1>
        </header>
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  /* Клиент не найден (RLS без auth / удалён) */
  if (!client) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            aria-label="Назад"
            onClick={() => {
              haptic('light')
              goBack()
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <h1 className={styles.headerTitle}>Профиль клиента</h1>
        </header>
        <ErrorState
          title="Клиент не найден"
          message="Не удалось загрузить карточку клиента. Если это продолжается — возможно, нужен вход (этап 3: Supabase Auth)."
          onRetry={retry}
        />
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      {/* Шапка */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          aria-label="Назад"
          onClick={() => {
            haptic('light')
            goBack()
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <h1 className={styles.headerTitle}>Профиль клиента</h1>
      </header>

      {/* Карточка клиента */}
      <Card className={styles.clientCard}>
        <div className={styles.clientHead}>
          <Avatar name={client.name} size="xl" />
          <div className={styles.clientInfo}>
            <h2 className={styles.clientName}>{client.name}</h2>
            <button className={styles.phone} onClick={onCopyPhone}>
              <Copy size={13} strokeWidth={1.5} />
              <span>{copied ? 'Скопировано ✓' : client.phone}</span>
            </button>
          </div>
        </div>

        <div className={styles.statusRow}>
          <span className={cx(styles.status, isActive ? styles.statusActive : styles.statusStale)}>
            <span className={cx(styles.statusDot, isActive ? styles.dotActive : styles.dotStale)} />
            {isActive ? 'Активный' : `Давно не был (${daysAway} дн.)`}
          </span>
          <Badge variant={isActive ? 'accent' : 'warning'}>{client.total_visits} визитов</Badge>
          {isLoyal && <Badge variant="success">ЛОЯЛЬНЫЙ КЛИЕНТ</Badge>}
        </div>

        {/* Мини-метрики: визитов · общий чек · средний чек */}
        <div className={styles.miniMetrics}>
          <div className={styles.miniMetric}>
            <span className={styles.miniValue}>{visits}</span>
            <span className={styles.miniLabel}>визитов</span>
          </div>
          <div className={styles.miniDivider} />
          <div className={styles.miniMetric}>
            <span className={styles.miniValue}>{formatMoney(spent)}</span>
            <span className={styles.miniLabel}>общий чек</span>
          </div>
          <div className={styles.miniDivider} />
          <div className={styles.miniMetric}>
            <span className={styles.miniValue}>{formatMoney(avg)}</span>
            <span className={styles.miniLabel}>средний чек</span>
          </div>
        </div>
      </Card>

      {/* История визитов — вертикальный таймлайн */}
      <section>
        <h2 className={styles.sectionTitle}>История визитов</h2>
        <div className={styles.timeline}>
          {history.map((procedure) => {
            const expanded = expandedNote === procedure.id
            return (
              <div key={procedure.id} className={styles.timelineItem}>
                <span className={styles.timelineDot} />
                <div className={styles.timelineBody}>
                  <div className={styles.timelineTop}>
                    <span className={styles.timelineDate}>{formatDate(procedure.created_at.slice(0, 10))}</span>
                    <span className={styles.timelinePrice}>{formatMoney(procedure.price)}</span>
                  </div>
                  <p className={styles.serviceName}>{procedure.service_type}</p>
                  {procedure.notes && (
                    <button
                      className={cx(styles.note, expanded && styles.noteOpen)}
                      onClick={() => {
                        haptic('light')
                        setExpandedNote(expanded ? null : procedure.id)
                      }}
                    >
                      {procedure.notes}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {history.length === 0 && (
            <p className={styles.noHistory}>Пока нет записанных процедур.</p>
          )}
        </div>
      </section>

      {/* Бонусы и скидки (таблица bonuses + баллы клиента) */}
      <section>
        <h2 className={styles.sectionTitle}>Бонусы и скидки</h2>
        <Card className={styles.bonusCard}>
          <div className={styles.bonusHead}>
            <div className={styles.bonusPoints}>
              <span className={styles.bonusValue}>{client.bonus_points}</span>
              <span className={styles.bonusLabel}>баллов</span>
            </div>
            <Badge variant="accent">Бонусная программа</Badge>
          </div>

          {/* Активные бонусы клиента из таблицы bonuses */}
          {clientBonuses.length > 0 && (
            <div className={styles.bonusList}>
              {clientBonuses.map((bonus) => (
                <div key={bonus.id} className={styles.bonusItem}>
                  <div className={styles.bonusItemTop}>
                    <span className={styles.bonusType}>
                      {bonus.type}
                      {bonus.value > 0 && <span className={styles.bonusValueTag}>{bonus.value}</span>}
                    </span>
                    <Badge variant={bonus.is_active ? 'success' : 'warning'}>
                      {bonus.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                  </div>
                  {bonus.description && <p className={styles.bonusDesc}>{bonus.description}</p>}
                  {bonus.expires_at && (
                    <span className={styles.bonusExpires}>до {formatDate(bonus.expires_at)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.bonusActions}>
            <Button variant="ghost" className={styles.bonusBtn} onClick={() => haptic('light')}>
              <Plus size={16} strokeWidth={2} />
              Начислить бонус
            </Button>
            <Button variant="ghost" className={styles.bonusBtn} onClick={() => haptic('light')}>
              <Percent size={16} strokeWidth={2} />
              Создать скидку
            </Button>
          </div>
        </Card>
      </section>

      {/* Sticky-действия внизу */}
      <div className={styles.actions}>
        <Button
          size="lg"
          className={styles.actionBtn}
          onClick={() => {
            haptic('medium')
            openAddProcedure(client.id)
          }}
        >
          <Plus size={18} strokeWidth={2} />
          Записать процедуру
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className={styles.actionBtn}
          onClick={() => {
            haptic('light')
            navigate('chat')
          }}
        >
          <Send size={16} strokeWidth={2} />
          Написать
        </Button>
      </div>
    </div>
  )
}
