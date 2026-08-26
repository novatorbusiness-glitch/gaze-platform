import { useMemo, useState } from 'react'
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
import { haptic } from '../lib/telegram'
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

  const [periodId, setPeriodId] = useState<AnalyticsPeriodData['id']>('month')
  const [activeBar, setActiveBar] = useState<number | null>(null)

  const period =
    demoAnalyticsPeriods.find((p) => p.id === periodId) ?? demoAnalyticsPeriods[1]

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
        {/* T9.2 — прибыль за период (доход − расходы на материалы) */}
        <MetricTile
          label="Прибыль"
          value={period.profit}
          unit="₽"
          trend={period.trends.profit}
          className={styles.profitTile}
        />
      </div>

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
