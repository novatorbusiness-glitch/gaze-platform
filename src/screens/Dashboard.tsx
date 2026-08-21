import { BookOpen, MessageCircle, PenLine, UserPlus } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ClientRow from '../components/ClientRow'
import MetricCard from '../components/MetricCard'
import { useCountUp } from '../hooks/useCountUp'
import {
  averageCheck,
  clients,
  currentMaster,
  getClientById,
  monthIncome,
  recentProcedures,
} from '../lib/mock'
import { haptic } from '../lib/telegram'
import { formatDate, formatMoney, greeting } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Dashboard.module.css'

const UNREAD_MESSAGES = 3

export default function Dashboard() {
  const navigate = useAppStore((s) => s.navigate)
  const openClient = useAppStore((s) => s.openClient)

  const income = useCountUp(monthIncome())
  const avg = useCountUp(averageCheck())
  const totalClients = clients.length

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

  /* Пустое состояние (новый мастер): вместо метрик — одна большая карточка */
  if (totalClients === 0) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {greeting()}, {currentMaster.name} 👋
          </h1>
          <Badge>GAZE PLATFORM</Badge>
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
          {greeting()}, {currentMaster.name} 👋
        </h1>
        <Badge>GAZE PLATFORM</Badge>
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
          onClick={() => haptic('light')}
        >
          <MessageCircle size={20} strokeWidth={1.5} className={styles.quickIcon} />
          <span>Сообщения</span>
          {UNREAD_MESSAGES > 0 && <span className={styles.unread}>{UNREAD_MESSAGES}</span>}
        </button>
      </div>

      {/* Недавние визиты */}
      <h2 className={styles.sectionTitle}>Недавние визиты</h2>
      <div className="stagger">
        {recentProcedures(4).map((procedure) => {
          const client = getClientById(procedure.client_id)
          return (
            <ClientRow
              key={procedure.id}
              name={client?.name ?? 'Клиент'}
              date={formatDate(procedure.created_at.slice(0, 10))}
              amount={procedure.price}
              onClick={() => client && openClient(client.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
