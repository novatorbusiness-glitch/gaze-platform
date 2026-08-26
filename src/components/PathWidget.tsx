import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Map } from 'lucide-react'
import type { Client, Procedure } from '../lib/mock'
import { getPathLevel, syncPathProgress, type PathEvaluation } from '../lib/path'
import { haptic, hapticSuccess } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import styles from './PathWidget.module.css'

interface PathWidgetProps {
  masterId: string | null
  clients: Client[]
  procedures: Procedure[]
  isDemo: boolean
}

/**
 * G1b — Виджет «Путь роста» на дашборде.
 * Считает чекпоинты по данным, которые УЖЕ загружены на дашборд (без сети),
 * и показывает текущий уровень + прогресс. Не блокирует остальное приложение.
 * При автопереходе — уведомление «🎉 Уровень пройден!» (hapticSuccess + тост).
 */
export default function PathWidget({ masterId, clients, procedures, isDemo }: PathWidgetProps) {
  const openPath = useAppStore((s) => s.openPath)
  const [evalState, setEvalState] = useState<PathEvaluation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const prevLevelRef = useRef<number | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!masterId) return
    const ev = syncPathProgress(masterId, clients, procedures, isDemo)
    setEvalState(ev)

    // Уведомление только при РЕАЛЬНОМ переходе уровня (не при каждом пересчёте)
    const prev = prevLevelRef.current
    if (ev.advanced && (prev === null || ev.toLevel > prev)) {
      hapticSuccess()
      setToast(`🎉 Уровень пройден: «${getPathLevel(ev.toLevel).name}»!`)
      if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(null), 3200)
    }
    prevLevelRef.current = ev.state.level
  }, [masterId, clients, procedures, isDemo])

  const level = evalState?.state.level ?? 1
  const pathLevel = getPathLevel(level)
  const list = evalState?.checkpointList ?? []
  const done = list.filter((c) => c.done).length
  const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0

  return (
    <>
      <button
        className={styles.widget}
        onClick={() => {
          haptic('light')
          openPath('dashboard')
        }}
        aria-label={`Путь роста: уровень ${level} ${pathLevel.name}, ${pct}%`}
      >
        <span className={styles.widgetIcon}>
          <Map size={18} strokeWidth={2} />
        </span>
        <span className={styles.widgetBody}>
          <span className={styles.widgetTop}>
            <span className={styles.widgetTitle}>
              Уровень {level} · {pathLevel.name}
            </span>
            <span className={styles.widgetPct}>{pct}%</span>
          </span>
          <span className={styles.track}>
            <span className={styles.fill} style={{ width: `${pct}%` }} />
          </span>
          <span className={styles.widgetSub}>
            {list.length === 0
              ? 'Система считает прогресс…'
              : pct === 100
                ? 'Уровень пройден — система готовит следующий'
                : `Выполнено ${done} из ${list.length} чекпоинтов · цель ${pathLevel.goalLabel} ₽`}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2} className={styles.widgetArrow} />
      </button>

      {toast && (
        <div className={styles.toast} role="status">
          <span>{toast}</span>
        </div>
      )}
    </>
  )
}
