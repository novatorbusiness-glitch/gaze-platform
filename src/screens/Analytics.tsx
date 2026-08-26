import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { useCountUp } from '../hooks/useCountUp'
import {
  demoAnalyticsPeriods,
  demoClients,
  type AnalyticsPeriodData,
  type TrendDir,
} from '../lib/dev-data'
import { expensesSince, loadExpenses, monthExpensesTotal } from '../lib/expenses'
import { haptic } from '../lib/telegram'
import { getTipsStats } from '../lib/tips'
import { cx, daysSince, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Analytics.module.css'

const STALE_DAYS = 30

/** Индикатор тренда: ↑ зелёный / ↓ оранжевый / — серый (ТЗ, ЭКРАН 5) */
function TrendIndicator({ trend }: { trend: { dir: TrendDir; delta: number } }) {
  if (trend.dir === 'flat') {
    return (
      <span className={cx(styles.trend, styles.trendFlat)}>
        <span className={styles.trendArrow}>—</span>
      </span>
    )
  }
  const up = trend.dir === 'up'
  return (
    <span className={cx(styles.trend, up ? styles.trendUp : styles.trendDown)}>
      <span className={styles.trendArrow}>{up ? '↑' : '↓'}</span>
      <span className={styles.trendDelta}>{up ? '+' : '−'}{trend.delta}%</span>
    </span>
  )
}

/** Мини-карточка метрики: цифра (JetBrains Mono) + подпись + тренд */
function MetricTile({
  label,
  value,
  unit,
  trend,
  className,
}: {
  label: string
  value: number
  /** ₽ / % / пусто */
  unit?: '₽' | '%' | ''
  trend: { dir: TrendDir; delta: number }
  /** T9.2 — доп. класс (напр. широкая карточка прибыли) */
  className?: string
}) {
  const animated = useCountUp(value)
  const display =
    unit === '₽'
      ? formatMoney(animated)
      : unit === '%'
        ? `${animated}%`
        : String(animated)
  return (
    <Card className={cx(styles.metricCard, className)}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{display}</span>
      <TrendIndicator trend={trend} />
    </Card>
  )
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

export default function Analytics() {
  const isDemo = useMasterStore((s) => s.isDemo)
  const openClientsWithFilter = useAppStore((s) => s.openClientsWithFilter)
  const navigate = useAppStore((s) => s.navigate)

  const [periodId, setPeriodId] = useState<AnalyticsPeriodData['id']>('month')
  const [activeBar, setActiveBar] = useState<number | null>(null)

  const period =
    demoAnalyticsPeriods.find((p) => p.id === periodId) ?? demoAnalyticsPeriods[1]

  // T17 — отдельные расходы (gaze_expenses): за период по диапазону дат.
  // Неделя — последние 7 дней, квартал — последние 90, месяц — календарный месяц.
  const otherExpenses = useMemo(() => {
    const records = loadExpenses()
    if (periodId === 'week') return expensesSince(records, 7)
    if (periodId === 'quarter') return expensesSince(records, 90)
    return monthExpensesTotal(records)
  }, [periodId])

  // T17 — все расходы = материалы из процедур + прочие расходы (аренда/реклама…)
  const totalCost = period.cost + otherExpenses
  const totalProfit = period.income - totalCost

  // T9.3 — юнит-экономика: маржа (прибыль / доход) и прибыль на клиента
  const unitMargin = period.income > 0 ? Math.round((totalProfit / period.income) * 100) : 0
  const unitPerClient = period.clients > 0 ? Math.round(totalProfit / period.clients) : 0

  // T16 — чаевые через QR: статистика из localStorage gaze_tips (демо-счётчик)
  const tips = useMemo(() => getTipsStats(), [])
  const tipsAnimated = useCountUp(tips.monthSum)

  // Инсайт: сколько клиентов не были 30+ дней (считается из реального списка)
  const staleCount = useMemo(
    () => demoClients.filter((c) => daysSince(c.last_visit) >= STALE_DAYS).length,
    [],
  )

  const maxBar = Math.max(...period.daily.map((d) => d.value), 1)
  const maxShare = Math.max(...period.topServices.map((s) => s.share), 1)

  const switchPeriod = (id: AnalyticsPeriodData['id']) => {
    haptic('light')
    setPeriodId(id)
    setActiveBar(null)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Аналитика</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>

      {/* Период — pill-табы: Неделя · Месяц · Квартал */}
      <div className={styles.filters}>
        {demoAnalyticsPeriods.map((p) => (
          <button
            key={p.id}
            className={cx(styles.filterBtn, periodId === p.id && styles.filterActive)}
            onClick={() => switchPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ГЛАВНОЕ — карточка-рекомендация 💡 (Conceptual Card с glow) */}
      <Card className={styles.insightCard}>
        <div className={styles.insightHead}>
          <span className={styles.insightIcon}>💡</span>
          <Badge variant="cta">ИНСАЙТ</Badge>
        </div>
        <p className={styles.insightText}>
          У тебя <strong className={styles.insightNum}>{staleCount}</strong>{' '}
          {pluralClients(staleCount)} не {pluralClients(staleCount) === 'клиент' ? 'был' : 'были'}{' '}
          больше месяца. Отправь им напоминание — обычно 30% возвращаются.
        </p>
        <Button
          fullWidth
          size="md"
          onClick={() => {
            haptic('medium')
            openClientsWithFilter('stale')
          }}
        >
          Посмотреть список
        </Button>
      </Card>

      {/* Метрики — 2×2 grid */}
      <div className={styles.metrics}>
        <MetricTile label="Доход" value={period.income} unit="₽" trend={period.trends.income} />
        <MetricTile label="Клиентов" value={period.clients} unit="" trend={period.trends.clients} />
        <MetricTile label="Средний чек" value={period.avgCheck} unit="₽" trend={period.trends.avgCheck} />
        <MetricTile label="Повторных" value={period.repeatRate} unit="%" trend={period.trends.repeatRate} />
        {/* T9.2 — прибыль за период. T17: доход − материалы из процедур − прочие расходы */}
        <MetricTile
          label="Прибыль"
          value={totalProfit}
          unit="₽"
          trend={period.trends.profit}
          className={styles.profitTile}
        />
      </div>

      {/* T9.3 — Юнит-экономика: доход, расходы, прибыль, маржа, прибыль на клиента.
          T17 — добавлены «Прочие расходы» и «Всего расходов» (аренда/реклама и т.д.
          из gaze_expenses), прибыль считается от всех расходов. */}
      <Card className={styles.unitCard}>
        <h2 className={styles.sectionTitle}>Юнит-экономика</h2>
        <div className={styles.unitTable}>
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Доход</span>
            <span className={styles.unitValue}>{formatMoney(period.income)}</span>
          </div>
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Расходы на материалы</span>
            <span className={cx(styles.unitValue, styles.unitCost)}>−{formatMoney(period.cost)}</span>
          </div>
          {/* T17 — отдельные расходы из gaze_expenses (аренда, реклама, инструменты…) */}
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Прочие расходы</span>
            <span className={cx(styles.unitValue, styles.unitCost)}>−{formatMoney(otherExpenses)}</span>
          </div>
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Всего расходов</span>
            <span className={cx(styles.unitValue, styles.unitCost)}>−{formatMoney(totalCost)}</span>
          </div>
          <div className={cx(styles.unitRow, styles.unitTotalRow)}>
            <span className={styles.unitLabel}>Прибыль</span>
            <span className={cx(styles.unitValue, styles.unitProfit)}>{formatMoney(totalProfit)}</span>
          </div>
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Маржинальность</span>
            <span className={styles.unitValue}>{unitMargin}%</span>
          </div>
          <div className={styles.unitRow}>
            <span className={styles.unitLabel}>Прибыль на клиента</span>
            <span className={styles.unitValue}>{formatMoney(unitPerClient)}</span>
          </div>
        </div>
        {/* T17 — вход на экран «Расходы» (отдельный учёт расходов мастера) */}
        <Button
          variant="ghost"
          fullWidth
          onClick={() => {
            haptic('medium')
            navigate('expenses')
          }}
        >
          <Receipt size={16} strokeWidth={2} />
          Расходы · записать или посмотреть список
        </Button>
      </Card>

      {/* T16 — Чаевые через QR: демо-счётчик из localStorage gaze_tips */}
      <Card className={styles.tipsCard}>
        <div className={styles.tipsHead}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.tipsHeadIcon}>💛</span> Чаевые
          </h2>
          <Badge variant="demo">ДЕМО</Badge>
        </div>
        <div className={styles.tipsValueRow}>
          <span className={styles.tipsPlus}>+</span>
          <span className={styles.tipsValue}>{formatMoney(tipsAnimated)}</span>
          <span className={styles.tipsPeriod}>за месяц</span>
        </div>
        <div className={styles.tipsMeta}>
          <span className={styles.tipsMetaItem}>{tips.monthCount} чаевых за месяц</span>
          <span className={styles.tipsMetaItem}>всего {formatMoney(tips.totalSum)}</span>
        </div>
        <p className={styles.tipsHint}>
          Показывай QR после визита — в карточке клиента есть кнопка «Чаевые». Счётчик живёт в localStorage
          (<span className={styles.tipsMono}>gaze_tips</span>).
        </p>
      </Card>

      {/* График: Доход по дням (div-based bar chart) */}
      <Card className={styles.chartCard}>
        <h2 className={styles.sectionTitle}>Доход по дням</h2>
        <div className={styles.chart}>
          {period.daily.map((bar, i) => (
            <div key={`${period.id}-${i}`} className={styles.barCol}>
              <div
                className={styles.barArea}
                onClick={() => {
                  haptic('light')
                  setActiveBar(activeBar === i ? null : i)
                }}
              >
                <div className={styles.barTrack}>
                  <div
                    className={cx(styles.bar, bar.isToday && styles.barToday)}
                    style={{ height: `${Math.max((bar.value / maxBar) * 100, bar.value > 0 ? 4 : 1.5)}%` }}
                  />
                </div>
                {activeBar === i && bar.value > 0 && (
                  <div className={styles.tooltip}>{formatMoney(bar.value)}</div>
                )}
              </div>
              <span className={styles.barLabel}>{bar.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Топ услуг — горизонтальные бары */}
      <Card className={styles.servicesCard}>
        <h2 className={styles.sectionTitle}>Что приносит больше всего</h2>
        <div className={styles.services}>
          {period.topServices.map((service, i) => (
            <div key={service.name} className={styles.service}>
              <div className={styles.serviceTop}>
                <span className={styles.serviceName}>{service.name}</span>
                <span className={styles.serviceSum}>
                  {formatMoney(service.sum)} · {service.share}%
                </span>
              </div>
              <div className={styles.serviceTrack}>
                <div
                  className={styles.serviceFill}
                  style={{ width: `${(service.share / maxShare) * 100}%`, animationDelay: `${i * 0.08}s` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
