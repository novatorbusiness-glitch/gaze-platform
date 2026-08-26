import { useRef, useState } from 'react'
import { BookOpen, Check, Copy, MessageCircle, PenLine, Send, UserPlus } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ClientRow from '../components/ClientRow'
import ErrorState from '../components/ErrorState'
import MetricCard from '../components/MetricCard'
import OnboardingQuest from '../components/OnboardingQuest'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { useCountUp } from '../hooks/useCountUp'
import { fetchDashboard } from '../lib/api'
import { demoReminders, demoAnalytics, demoClients, demoMaster, demoProcedures, type ReminderStatus } from '../lib/dev-data'
import { monthOtherExpenses } from '../lib/expenses'
import type { Client, Procedure } from '../lib/mock'
import { useDisplayName } from '../lib/name'
import {
  loadOnboarding,
  saveOnboarding,
  type OnboardingState,
  type OnboardingStep,
} from '../lib/onboarding'
import { copyText, haptic } from '../lib/telegram'
import {
  buildTgChatUrl,
  listSentClientIds,
  markReminderSent,
  openTelegramLink,
  parseClientLink,
} from '../lib/reminders'
import { daysSince, formatDate, formatMoney, greeting, monthExpenses } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Dashboard.module.css'

const UNREAD_MESSAGES = 3

const REMINDER_STATUS_LABEL: Record<ReminderStatus, string> = {
  confirmed: 'Подтверждено',
  pending: 'Ожидает',
  new: 'Новое',
}

/** T2 — «Кого вернуть»: клиент остывает, если не был 30+ дней */
const STALE_DAYS = 30

/** T14 — текст напоминания для кнопок «Написать клиенту в Telegram» / «Скопировать» */
function buildReminderText(name: string): string {
  return `Здравствуйте, ${name}! Давно вас не видели — соскучились 💛 Хотите, подберу удобное время?`
}

/** Русская плюрализация: 1 клиент / 2 клиента / 5 клиентов */
function pluralClients(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'клиентов'
  if (last > 1 && last < 5) return 'клиента'
  if (last === 1) return 'клиент'
  return 'клиентов'
}

/** Русская плюрализация дней: 1 день / 2 дня / 5 дней */
function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (last > 1 && last < 5) return 'дня'
  if (last === 1) return 'день'
  return 'дней'
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

  // Единый источник имени: localStorage (gaze_profile_name) > master.name > 'Анна Казак'
  const displayName = useDisplayName(master)

  const masterId = master?.id ?? null
  const [attempt, setAttempt] = useState(0)

  // T2 — «Кого вернуть»: кому уже отправили напоминание (T14: из localStorage),
  // развёрнут ли список, тост
  const [reminded, setReminded] = useState<Set<string>>(() => new Set(listSentClientIds()))
  const [expanded, setExpanded] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  // T3 — онбординг-квест «Начни с 3 шагов»: прогресс из localStorage (gaze_onboarding)
  const [onboarding, setOnboarding] = useState<OnboardingState>(() => loadOnboarding())
  const insightsRef = useRef<HTMLDivElement | null>(null)

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

  // T9.2 — юнит-экономика: прибыль и маржа.
  // T17 — прибыль = доход − материалы из процедур − прочие расходы (gaze_expenses):
  // в демо: доход 96 400 − материалы 31 400 − прочие 25 000 = 40 000 ₽, маржа ~41%.
  const procSet = isDemo ? demoProcedures : procedures
  const otherExpenses = monthOtherExpenses()
  const rawIncome = isDemo ? demoAnalytics.incomeMonth : monthIncome(procedures)
  const rawMaterials = monthExpenses(procSet)
  const profit = useCountUp(rawIncome - rawMaterials - otherExpenses)
  const margin = rawIncome > 0 ? Math.round(((rawIncome - rawMaterials - otherExpenses) / rawIncome) * 100) : 0

  const demoBadge = isDemo ? <Badge variant="demo">DEMO</Badge> : null

  const loading = masterStatus === 'loading' || (masterStatus === 'ready' && dash.status === 'loading')
  // В демо-режиме ошибку RLS не показываем: демо-данные уже успешно отданы
  const error = masterStatus === 'error' ? masterError : dash.status === 'error' ? dash.error : null

  const clientById = new Map(clients.map((c) => [c.id, c]))
  const recent = procedures.slice(0, 4)

  // T2 — «Кого вернуть»: остывающие клиенты (30+ дней), самые «горячие» сверху.
  // В демо-режиме клиенты приходят из demoClients — цифры считаются честно оттуда.
  const staleClients = clients
    .map((c) => ({ ...c, days: daysSince(c.last_visit) }))
    .filter((c) => c.days >= STALE_DAYS)
    .sort((a, b) => b.days - a.days)
  const staleSum = staleClients.reduce((sum, c) => sum + c.total_spent, 0)
  const visibleStale = expanded ? staleClients : staleClients.slice(0, 5)

  const quickActions = [
    {
      icon: UserPlus,
      label: 'Добавить клиента',
      onClick: () => {
        haptic('light')
        navigate('addClient')
      },
    },
    {
      icon: PenLine,
      label: 'Записать процедуру',
      onClick: () => {
        haptic('light')
        navigate('addProcedure')
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

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  // T2 — «Отправить напоминание»: T14 — РУЧНАЯ отправка (клиенты не в боте,
  // sendViaBot не вызываем). Есть Telegram-ссылка → СРАЗУ открываем deep-link
  // t.me/<username>?text=… (Telegram сам подставит текст), в карточке появляются
  // кнопки «Написать клиенту в Telegram» и «Скопировать текст».
  // Нет ссылки → «Скопировать телефон».
  const sendReminder = async (client: Client & { days?: number }) => {
    haptic('medium')
    const target = parseClientLink(client.link)
    const reminderText = buildReminderText(client.name)
    if (target) {
      // сразу открываем чат с готовым текстом — мастеру остаётся нажать «Отправить»
      openTelegramLink(buildTgChatUrl(target.username, reminderText))
      setReminded((prev) => new Set(prev).add(client.id))
      markReminderSent(client.id, 'return')
      showToast(`Чат с ${client.name} открыт — текст уже в поле ввода`)
    } else if (client.phone) {
      await copyText(client.phone)
      setReminded((prev) => new Set(prev).add(client.id))
      markReminderSent(client.id, 'return')
      showToast(`Телефон ${client.name} скопирован — напишите ей`)
    } else {
      showToast(`У ${client.name} нет ссылки — добавьте в карточке`)
    }
  }

  // T3 — отметить шаг квеста сделанным и сохранить прогресс в localStorage
  const completeQuestStep = (step: OnboardingStep) => {
    setOnboarding((prev) => {
      if (prev[step]) return prev
      const next = { ...prev, [step]: true }
      saveOnboarding(next)
      return next
    })
  }

  // T3 — клик по шагу квеста: «client»/«procedure» → форма (T1),
  // «insight» → отметить и плавно скроллить к блоку «Кого вернуть» (T2)
  const handleQuestStep = (step: OnboardingStep) => {
    haptic('light')
    if (step === 'insight') {
      completeQuestStep('insight')
      requestAnimationFrame(() => {
        insightsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
    navigate(step === 'client' ? 'addClient' : 'addProcedure')
  }

  // T3 — сам блок квеста (или «Вы в деле! 🎉», когда все 3 шага сделаны)
  const questBlock = <OnboardingQuest state={onboarding} onStep={handleQuestStep} />

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
          <SkeletonLoader shape="card" width={150} height={90} />
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
          <h1 className={styles.title}>{greeting()}, {displayName} 👋</h1>
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
            {greeting()}, {displayName} 👋
          </h1>
          <div className={styles.badgeRow}>
            <Badge>GAZE PLATFORM</Badge>
            {demoBadge}
          </div>
        </header>

        {/* T3 — онбординг-квест для нового мастера */}
        {questBlock}

        <Card className={styles.emptyCard}>
          <p className={styles.emptyText}>
            Добавь первого клиента — и платформа начнёт работать на тебя
          </p>
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              haptic('medium')
              navigate('addClient')
            }}
          >
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
          {greeting()}, {displayName} 👋
        </h1>
        <div className={styles.badgeRow}>
          <Badge>GAZE PLATFORM</Badge>
          {demoBadge}
        </div>
      </header>

      {/* T3 — онбординг-квест «Начни с 3 шагов» (сверху, перед метриками) */}
      {questBlock}

      {/* Три метрики — горизонтальный скролл */}
      <div className={styles.metrics}>
        <MetricCard label="Клиентов всего" value={String(totalClients)} />
        <MetricCard label="Доход за месяц" value={formatMoney(income)} />
        <MetricCard label="Средний чек" value={formatMoney(avg)} />
        {/* T9.2 — прибыль за месяц: доход − расходы на материалы, с маржой */}
        <MetricCard label="Прибыль за месяц" value={formatMoney(profit)} caption={`маржа ${margin}%`} />
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

      {/* T2 — «Кого вернуть»: инсайты-крючки (Нейро-Воронка: открытая петля / Зейгарник) */}
      {staleClients.length > 0 && (
        <>
          <div ref={insightsRef} className={styles.insightTitleRow}>
            <h2 className={styles.sectionTitle}>Кого вернуть</h2>
            <Badge variant="warning">{staleClients.length}</Badge>
          </div>

          <div className="stagger">
            {visibleStale.map((client) => {
              const sent = reminded.has(client.id)
              const target = parseClientLink(client.link)
              return (
                <Card key={client.id} className={styles.staleCard}>
                  <div className={styles.staleInfo}>
                    <span className={styles.staleName}>{client.name}</span>
                    <span className={styles.staleMeta}>
                      не была {client.days} {pluralDays(client.days)} · чек{' '}
                      {formatMoney(client.total_spent)}
                    </span>
                  </div>
                  <Button
                    fullWidth
                    size="md"
                    variant="ghost"
                    disabled={sent}
                    className={sent ? styles.remindSent : undefined}
                    onClick={() => sendReminder(client)}
                  >
                    {sent ? (
                      <>
                        <Check size={16} strokeWidth={2.5} /> Отправлено
                      </>
                    ) : (
                      <>
                        <Send size={15} strokeWidth={2} /> Отправить напоминание
                      </>
                    )}
                  </Button>
                  {/* T14 — после «Отправить»: реальное действие вместо пустого тоста */}
                  {sent && (
                    <div className={styles.staleActions}>
                      {target ? (
                        <>
                          <Button
                            fullWidth
                            size="md"
                            onClick={() =>
                              openTelegramLink(
                                buildTgChatUrl(target.username, buildReminderText(client.name)),
                              )
                            }
                          >
                            <Send size={14} strokeWidth={2} />
                            Написать клиенту в Telegram
                          </Button>
                          <Button
                            fullWidth
                            size="md"
                            variant="ghost"
                            onClick={async () => {
                              await copyText(buildReminderText(client.name))
                              showToast('Текст скопирован ✓')
                            }}
                          >
                            <Copy size={14} strokeWidth={2} />
                            Скопировать текст
                          </Button>
                        </>
                      ) : client.phone ? (
                        <Button
                          fullWidth
                          size="md"
                          variant="ghost"
                          onClick={async () => {
                            await copyText(client.phone)
                            showToast('Телефон скопирован ✓')
                          }}
                        >
                          <Copy size={14} strokeWidth={2} />
                          Скопировать телефон
                        </Button>
                      ) : (
                        <span className={styles.staleHint}>
                          Нет ссылки и телефона — добавьте в карточке
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {staleClients.length > 5 && (
            <button
              className={styles.expandBtn}
              onClick={() => {
                haptic('light')
                setExpanded((e) => !e)
              }}
            >
              {expanded ? 'Свернуть список' : `Показать всех (${staleClients.length})`}
            </button>
          )}

          {/* Крючок-итог: конкретика с цифрами (по «Нейро-Воронке») */}
          <div className={styles.staleHook}>
            <span className={styles.staleHookEmoji}>💡</span>
            <p className={styles.staleHookText}>
              GAZE заметила:{' '}
              <strong className={styles.staleHookNum}>{staleClients.length}</strong>{' '}
              {pluralClients(staleClients.length)}{' '}
              {pluralClients(staleClients.length) === 'клиент' ? 'не был' : 'не были'} больше
              месяца. Верни их — это{' '}
              <strong className={styles.staleHookNum}>~{formatMoney(staleSum)}</strong>.
            </p>
          </div>
        </>
      )}

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

      {/* Тост (T14: реальный статус — открыт чат / скопирован телефон) */}
      {toast && (
        <div className={styles.toast} role="status">
          <Check size={16} strokeWidth={2.5} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
