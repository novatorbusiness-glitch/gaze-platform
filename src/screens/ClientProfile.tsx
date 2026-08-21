import { useState } from 'react'
import { ArrowLeft, Copy, Percent, Plus, Send } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { useCountUp } from '../hooks/useCountUp'
import { getClientById, getClientProcedures } from '../lib/mock'
import { copyText, haptic } from '../lib/telegram'
import { cx, daysSince, formatDate, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './ClientProfile.module.css'

const STALE_DAYS = 30

interface ClientProfileProps {
  /** Опционально: ID клиента. По умолчанию — из навигационного стора. */
  clientId?: string
}

export default function ClientProfile({ clientId }: ClientProfileProps) {
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const goBack = useAppStore((s) => s.goBack)

  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const client = getClientById(clientId ?? selectedClientId ?? '')

  const history = client ? getClientProcedures(client.id) : []
  const daysAway = client ? daysSince(client.last_visit) : 0
  const isActive = daysAway < STALE_DAYS
  const isLoyal = client ? client.total_visits >= 5 : false
  const avgCheck =
    client && client.total_visits > 0 ? Math.round(client.total_spent / client.total_visits) : 0

  const visits = useCountUp(client ? client.total_visits : 0)
  const spent = useCountUp(client ? client.total_spent : 0)
  const avg = useCountUp(avgCheck)

  if (!client) return null

  const onCopyPhone = async () => {
    await copyText(client.phone)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
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

      {/* Бонусы и скидки */}
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
        <Button size="lg" className={styles.actionBtn} onClick={() => haptic('medium')}>
          <Plus size={18} strokeWidth={2} />
          Записать процедуру
        </Button>
        <Button size="lg" variant="ghost" className={styles.actionBtn} onClick={() => haptic('light')}>
          <Send size={16} strokeWidth={2} />
          Написать
        </Button>
      </div>
    </div>
  )
}
