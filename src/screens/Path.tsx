import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, CircleDot, RefreshCw } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorState from '../components/ErrorState'
import SkeletonLoader from '../components/SkeletonLoader'
import { friendlyError } from '../lib/api'
import {
  checkLevelProgress,
  getPathLevel,
  MAX_PATH_LEVEL,
  PATH_LEVELS,
  type PathEvaluation,
  type PathMetrics,
} from '../lib/path'
import { hapticSuccess } from '../lib/telegram'
import { cx, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Path.module.css'

/** Живое значение чекпоинта — показываем рядом с галочкой/кружком */
function checkpointValue(id: string, m: PathMetrics | undefined): string | null {
  if (!m) return null
  switch (id) {
    case 'clients':
      return `сейчас ${m.clientsCount}`
    case 'returns':
      return `сейчас ${m.returnsThisMonth}`
    case 'avgCheck':
      return `чек ${formatMoney(m.avgCheck)}`
    case 'newClients':
      return `сейчас ${m.newClientsThisMonth}`
    case 'referral':
      return `сейчас ${m.referralCount}`
    case 'reminders':
      return `сейчас ${m.remindersCount}`
    case 'tips':
      return `сейчас ${m.tipsCount}`
    case 'income2m':
      return `доход ${formatMoney(m.incomeMonth)}`
    default:
      return null
  }
}

/**
 * G1b — Экран «Путь роста»: карта 6 уровней (База → Масштаб).
 * Система сама передвигает мастера по реальным метрикам платформы.
 * Чекпоинты пересчитываются при открытии экрана и по кнопке «Обновить прогресс».
 */
export default function Path() {
  const goBack = useAppStore((s) => s.goBack)
  const master = useMasterStore((s) => s.master)
  const masterStatus = useMasterStore((s) => s.status)
  const masterError = useMasterStore((s) => s.error)
  const initMaster = useMasterStore((s) => s.init)

  const [evaluation, setEvaluation] = useState<PathEvaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  const refresh = useCallback(
    async (silent = false) => {
      if (!master?.id) {
        // Мастер не определился — ошибку покажет гейт ниже (с повтором initMaster)
        setLoading(false)
        setError(null)
        return
      }
      if (!silent) setLoading(true)
      try {
        const ev = await checkLevelProgress(master.id)
        setEvaluation(ev)
        setError(ev.error ? (ev.errorMessage ?? 'Не удалось получить данные. Проверь интернет и попробуй ещё раз.') : null)
        if (ev.advanced) {
          hapticSuccess()
          showToast(`🎉 Уровень пройден: «${getPathLevel(ev.toLevel).name}»!`)
        }
      } catch (err) {
        /* сеть/RLS упали — показываем причину и даём повторить */
        setError(friendlyError(err))
      } finally {
        setLoading(false)
      }
    },
    [master, showToast],
  )

  useEffect(() => {
    refresh(true)
  }, [refresh])

  const retryMaster = () => {
    setLoading(true)
    setError(null)
    initMaster(true).then(() => refresh(true))
  }

  /* Мастер ещё определяется — скелетон */
  if (!master && masterStatus === 'loading') {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goBack} aria-label="Назад">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Путь роста</h1>
            <p className={styles.subtitle}>6 уровней до 200к+ в месяц</p>
          </div>
        </header>
        <SkeletonLoader shape="card" height={150} />
        <SkeletonLoader shape="card" height={120} />
        <SkeletonLoader shape="card" height={120} />
        <SkeletonLoader shape="card" height={120} />
      </div>
    )
  }

  /* Мастер не определился (RLS/сеть/auth) — ошибка с повтором вместо пустого уровня 1 */
  if (!master) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goBack} aria-label="Назад">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Путь роста</h1>
            <p className={styles.subtitle}>6 уровней до 200к+ в месяц</p>
          </div>
        </header>
        <ErrorState
          message={masterError ?? 'Не удалось загрузить аккаунт. Проверь интернет и попробуй ещё раз.'}
          onRetry={retryMaster}
        />
      </div>
    )
  }

  /* Первая загрузка данных пути */
  if (loading && !evaluation) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goBack} aria-label="Назад">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Путь роста</h1>
            <p className={styles.subtitle}>6 уровней до 200к+ в месяц</p>
          </div>
        </header>
        <SkeletonLoader shape="card" height={150} />
        <SkeletonLoader shape="card" height={120} />
        <SkeletonLoader shape="card" height={120} />
        <SkeletonLoader shape="card" height={120} />
      </div>
    )
  }

  /* Ошибка при первой загрузке (данных для показа ещё нет) — вместо вечного скелетона */
  if (error && !evaluation) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button className={styles.back} onClick={goBack} aria-label="Назад">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Путь роста</h1>
            <p className={styles.subtitle}>6 уровней до 200к+ в месяц</p>
          </div>
        </header>
        <ErrorState message={error} onRetry={() => refresh(false)} />
      </div>
    )
  }

  const ev = evaluation
  const level = ev?.state.level ?? 1
  const pathLevel = getPathLevel(level)
  const metrics = ev?.metrics
  const checkpointList = ev?.checkpointList ?? []
  const doneCount = checkpointList.filter((c) => c.done).length
  const checkpointPct = checkpointList.length > 0 ? Math.round((doneCount / checkpointList.length) * 100) : 0

  // Доход к цели текущего уровня (шкала до goalMin)
  const incomePct =
    metrics && pathLevel.goalMin > 0 ? Math.min(100, Math.round((metrics.incomeMonth / pathLevel.goalMin) * 100)) : 0

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.back} onClick={goBack} aria-label="Назад">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Путь роста</h1>
          <p className={styles.subtitle}>Система сама ведёт тебя с уровня на уровень</p>
        </div>
        <Badge variant="accent" className={styles.headerBadge}>
          GAZE PATH
        </Badge>
      </header>

      {/* Ошибка обновления при уже показанных данных — баннер, данные остаются на экране */}
      {error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorBannerText}>{error}</span>
          <button className={styles.errorBannerRetry} onClick={() => refresh(false)}>
            Повторить
          </button>
        </div>
      )}

      {/* Текущий уровень: статус + прогресс + чекпоинты + обновление */}
      <Card className={styles.hero}>
        <div className={styles.heroTop}>
          <Badge variant="accent">
            УРОВЕНЬ {level} ИЗ {MAX_PATH_LEVEL}
          </Badge>
          <span className={styles.heroPct}>{checkpointPct}%</span>
        </div>
        <div className={styles.heroEmoji}>{pathLevel.emoji}</div>
        <h2 className={styles.heroName}>{pathLevel.name}</h2>
        <p className={styles.heroGoal}>Цель: {pathLevel.goalLabel} ₽/мес</p>
        <p className={styles.heroDesc}>{pathLevel.description}</p>

        {/* Доход к цели */}
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Доход за месяц</span>
          <span className={styles.metricValue}>{metrics ? formatMoney(metrics.incomeMonth) : '—'}</span>
        </div>
        <span className={styles.track}>
          <span className={styles.fill} style={{ width: `${incomePct}%` }} />
        </span>

        {/* Чекпоинты текущего уровня */}
        {checkpointList.length > 0 && (
          <div className={styles.checkpoints}>
            {checkpointList.map((cp) => (
              <div key={cp.id} className={styles.checkpoint}>
                <span className={cx(styles.checkpointIcon, cp.done && styles.checkpointDone)}>
                  {cp.done ? <Check size={13} strokeWidth={3} /> : <CircleDot size={13} strokeWidth={2} />}
                </span>
                <span className={styles.checkpointText}>
                  <span className={styles.checkpointLabel}>{cp.label}</span>
                  <span className={styles.checkpointHint}>
                    {cp.hint}
                    {checkpointValue(cp.id, metrics) ? ` · ${checkpointValue(cp.id, metrics)}` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        <Button fullWidth size="lg" onClick={() => refresh(false)} disabled={loading}>
          <RefreshCw size={16} strokeWidth={2.2} className={cx(loading && styles.spin)} />
          {loading ? 'Считаем…' : 'Обновить прогресс'}
        </Button>
      </Card>

      {/* Карта уровней — дорога из 6 ступеней */}
      <h2 className={styles.roadTitle}>Карта пути</h2>
      <div className={styles.road}>
        {PATH_LEVELS.map((lvl) => {
          const isDone = lvl.level < level
          const isCurrent = lvl.level === level
          const isNext = lvl.level > level
          return (
            <div
              key={lvl.level}
              className={cx(styles.level, isDone && styles.levelDone, isCurrent && styles.levelCurrent, isNext && styles.levelNext)}
            >
              <div className={styles.levelRail}>
                <span className={cx(styles.levelDot, isDone && styles.dotDone, isCurrent && styles.dotCurrent)}>
                  {isDone ? <Check size={14} strokeWidth={3} /> : lvl.level}
                </span>
                {lvl.level < MAX_PATH_LEVEL && (
                  <span className={cx(styles.levelLine, (isDone || isCurrent) && styles.lineActive)} />
                )}
              </div>
              <div className={styles.levelBody}>
                <div className={styles.levelTop}>
                  <span className={styles.levelName}>
                    {lvl.emoji} {lvl.name}
                  </span>
                  <span className={styles.levelGoal}>{lvl.goalLabel} ₽</span>
                </div>
                <p className={styles.levelDesc}>{lvl.description}</p>
                <div className={styles.levelChecks}>
                  {lvl.checkpoints.map((cp) => {
                    const done = isDone || Boolean(isCurrent && checkpointList.find((c) => c.id === cp.id)?.done)
                    return (
                      <span key={cp.id} className={cx(styles.levelCheck, done && styles.levelCheckDone)}>
                        {done ? <Check size={11} strokeWidth={3} /> : <span className={styles.levelCheckO} />}
                        {cp.label}
                      </span>
                    )
                  })}
                </div>
                <div className={styles.levelStatus}>
                  {isDone && (
                    <Badge variant="success">
                      <Check size={10} strokeWidth={3} /> Пройден
                    </Badge>
                  )}
                  {isCurrent && <Badge variant="accent">Сейчас здесь</Badge>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Тост-уведомление «Уровень пройден» */}
      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
