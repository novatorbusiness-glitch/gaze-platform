import { useState } from 'react'
import { BookOpen, MessageCircle, PenLine, UserPlus } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ClientRow from '../components/ClientRow'
import ErrorState from '../components/ErrorState'
import MetricCard from '../components/MetricCard'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { useCountUp } from '../hooks/useCountUp'
import { fetchDashboard } from '../lib/api'
import { demoReminders, demoAnalytics, demoClients, demoMaster, demoProcedures, type ReminderStatus } from '../lib/dev-data'
import type { Procedure } from '../lib/mock'
import { haptic } from '../lib/telegram'
import { formatDate, formatMoney, greeting } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Dashboard.module.css'

const UNREAD_MESSAGES = 3

const REMINDER_STATUS_LABEL: Record<ReminderStatus, string> = {
  confirmed: 'Подтверждено',
  pending: 'Ожидает',
  new: 'Новое',
}

/** Доход за текущий месяц (из процедур) */
function monthIncome(procedures: Procedure[]): number {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return procedures
    .filter((p) => p.created_at.slice(0, 7) === ym)
    .reduce((sum, p) => sum + p.price, 0)
}

/** Средний чек по всем процедурам */
function averageCheck(procedures: Procedure[]): number {
  if (procedures.length === 0) return 0
  const total = procedures.reduce((sum, p) => sum + p.price, 0)
  return Math.round(total / procedures.length)
}

export default function Dashboard() {
  const navigate = useAppStore((s) => s.navigate)
  const openClient = useAppStore((s) => s.openClient)

  const master = useMasterStore((s) => s.master)
  const masterStatus = useMasterStore((s) => s.status)
  const masterError = useMasterStore((s) => s.error)
  const isDemo = useMasterStore((s) => s.isDemo)
  const retryMaster = useMasterStore((s) => s.init)

  const masterId = master?.id ?? null
  const [attempt, setAttempt] = useState(0)

  const dash = useAsync(
    () => (masterId ? fetchDashboard(masterId) : Promise.resolve({ clients: [], procedures: [] })),
    [masterId, attempt],
  )

  // В демо-режиме метрики берём из demoAnalytics (точно по спецификации),
  // а списки — из демо-массива, если запрос к Supabase упал (RLS/сеть)
  const clients =
    isDemo && dash.status === 'error' ? demoClients : dash.data?.clients ?? []
  const procedures =
    isDemo && dash.status === 'error' ? demoProcedures : dash.data?.procedures ?? []

  const income = useCountUp(isDemo ? demoAnalytics.incomeMonth : monthIncome(procedures))
  const avg = useCountUp(isDemo ? demoAnalytics.avgCheck : averageCheck(procedures))
  const totalClients = isDemo ? (demoMaster.clients_count ?? clients.length) : clients.length

  const demoBadge = isDemo ? <Badge variant="demo">DEMO</Badge> : null

  const loading = masterStatus === 'loading' || (masterStatus === 'ready' && dash.status === 'loading')
  // В демо-режиме ошибку RLS не показываем: демо-данные уже успешно отданы
  const error = masterStatus === 'error' ? masterError : dash.status === 'error' ? dash.error : null

  const clientById = new Map(clients.map((c) => [c.id, c]))
  const recent = procedures.slice(0, 4)

  const quickActions = [
    {
      icon: UserPlus,
      label: 'Добавить клиента',
      onClick: () => {
        haptic('light')
        navigate('clients')
      },
    },
    {
      icon: PenLine,
      label: 'Записать процедуру',
      onClick: () => {
        haptic('light')
        navigate('clients')
      },
    },
    {
      icon: BookOpen,
      label: 'База знаний',
      onClick: () => {
        haptic('light')
        navigate('knowledge')
      },
    },
  ]

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
        <header className={styles.header}>
          <SkeletonLoader shape="title" width={210} height={28} />
          <SkeletonLoader shape="text" width={120} height={14} />
        </header>
        <div className={styles.metrics}>
          <SkeletonLoader shape="card" width={140} height={90} />
          <SkeletonLoader shape="card" width={150} height={90} />
          <SkeletonLoader shape="card" width={140} height={90} />
        </div>
        <div className={styles.quickGrid}>
          <SkeletonLoader shape="button" height={56} />
          <SkeletonLoader shape="button" height={56} />
          <SkeletonLoader shape="button" height={56} />
          <SkeletonLoader shape="button" height={56} />
        </div>
        <h2 className={styles.sectionTitle}>Недавние визиты</h2>
        <SkeletonLoader shape="card" height={64} />
        <SkeletonLoader shape="card" height={64} />
        <SkeletonLoader shape="card" height={64} />
      </div>
    )
  }

  /* Ошибка (RLS / сеть / Supabase не настроен). В демо-режиме не показываем:
     демо-данные уже успешно отданы, RLS-ошибку скрываем до этапа 3 */
  if (error && !isDemo) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.title}>{greeting()}, {master?.name ?? 'мастер'} 👋</h1>
          <div className={styles.badgeRow}>
            <Badge>GAZE PLATFORM</Badge>
            {demoBadge}
          </div>
        </header>
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  /* Пустое состояние (новый мастер): вместо метрик — одна большая карточка */
  if (totalClients === 0) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {greeting()}, {master?.name ?? 'мастер'} 👋
          </h1>
          <div className={styles.badgeRow}>
            <Badge>GAZE PLATFORM</Badge>
            {demoBadge}
          </div>
        </header>

        <Card className={styles.emptyCard}>
          <p className={styles.emptyText}>
            Добавь первого клиента — и платформа начнёт работать на тебя
          </p>
          <Button fullWidth size="lg" onClick={() => haptic('medium')}>
            + Первый клиент
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {greeting()}, {master?.name ?? 'мастер'} 👋
        </h1>
        <div className={styles.badgeRow}>
          <Badge>GAZE PLATFORM</Badge>
          {demoBadge}
        </div>
      </header>

      {/* Три метрики — горизонтальный скролл */}
      <div className={styles.metrics}>
        <MetricCard label="Клиентов всего" value={String(totalClients)} />
        <MetricCard label="Доход за месяц" value={formatMoney(income)} />
        <MetricCard label="Средний чек" value={formatMoney(avg)} />
      </div>

      {/* Быстрые действия — 2×2 grid */}
      <div className={styles.quickGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button key={action.label} className={styles.quickBtn} onClick={action.onClick}>
              <Icon size={20} strokeWidth={1.5} className={styles.quickIcon} />
              <span>{action.label}</span>
            </button>
          )
        })}
        <button
          className={styles.quickBtn}
          onClick={() => {
            haptic('light')
            navigate('chat')
          }}
        >
          <MessageCircle size={20} strokeWidth={1.5} className={styles.quickIcon} />
          <span>Сообщения</span>
          {UNREAD_MESSAGES > 0 && <span className={styles.unread}>{UNREAD_MESSAGES}</span>}
        </button>
      </div>

      {/* Напоминания (демо-режим: RLS без auth, этап 3) */}
      {isDemo && (
        <>
          <h2 className={styles.sectionTitle}>Напоминания</h2>
          <div className="stagger">
            {demoReminders.map((reminder) => (
              <Card key={reminder.id} className={styles.reminderCard}>
                <div className={styles.reminderTop}>
                  <span className={styles.reminderName}>{reminder.clientName}</span>
                  <Badge
                    variant={
                      reminder.status === 'confirmed'
                        ? 'success'
                        : reminder.status === 'pending'
                          ? 'warning'
                          : 'demo'
                    }
                  >
                    {REMINDER_STATUS_LABEL[reminder.status]}
                  </Badge>
                </div>
                <p className={styles.reminderText}>
                  {reminder.service} · {reminder.when}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Недавние визиты */}
      <h2 className={styles.sectionTitle}>Недавние визиты</h2>
      <div className="stagger">
        {recent.length > 0 ? (
          recent.map((procedure) => {
            const client = clientById.get(procedure.client_id)
            return (
              <ClientRow
                key={procedure.id}
                name={client?.name ?? 'Клиент'}
                date={formatDate(procedure.created_at.slice(0, 10))}
                amount={procedure.price}
                onClick={() => client && openClient(client.id)}
              />
            )
          })
        ) : (
          <Card className={styles.emptyCard}>
            <p className={styles.emptyText}>Пока нет записанных процедур.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
