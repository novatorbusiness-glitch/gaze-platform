import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Sparkles,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { haptic } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Growth.module.css'

/**
 * G3 — Экран «3 рычага роста мастера»: стартовый блок обучения.
 *
 * Доход мастера = Клиенты × Средний чек × Возвраты.
 * Три карточки-рычага объясняют каждый множитель, в конце — практическое
 * задание-чек-лист (наполнить базу, поднять чек комплексами, настроить
 * возврат через напоминания). Выполнение сохраняется в localStorage
 * (ключ gaze_growth) и ведёт в «Путь роста» (GAZE PATH).
 */

/** Ключ localStorage: состояние практического задания */
const GROWTH_KEY = 'gaze_growth'

interface Lever {
  id: 'clients' | 'check' | 'returns'
  num: string
  emoji: string
  title: string
  formula: string
  desc: string
  gaze: string
  goal: string
}

/** Три рычага роста — карточки блока */
const LEVERS: Lever[] = [
  {
    id: 'clients',
    num: '01',
    emoji: '👥',
    title: 'Больше клиентов',
    formula: 'база растёт → потолок дохода поднимается',
    desc: 'Пока в базе мало клиенток, доход упирается в потолок — сколько бы ни стоила процедура. Каждая новая клиентка — это новый визит и деньги в кассе.',
    gaze: 'Карточки клиенток после каждого визита, реферальная программа и список «давно не был» сами подсказывают, кому написать.',
    goal: '20+ клиенток в базе · 5+ новых в месяц',
  },
  {
    id: 'check',
    num: '02',
    emoji: '💎',
    title: 'Выше средний чек',
    formula: 'чек ×1,3 → доход ×1,3 без новых клиенток',
    desc: 'Чем выше средний чек, тем больше ты зарабатываешь с каждого визита — даже если число клиенток не меняется. Комплексы и доп-услуги поднимают чек на 30% и больше.',
    gaze: 'Аналитика считает средний чек сама и подсказывает, кому из клиенток предложить комплекс вместо базовой услуги.',
    goal: 'Средний чек +30%',
  },
  {
    id: 'returns',
    num: '03',
    emoji: '🔁',
    title: 'Возвраты',
    formula: 'вернувшаяся клиентка обходится почти бесплатно',
    desc: 'Найти новую клиентку дорого, вернуть свою — почти бесплатно. Одно напоминание в срок возвращает до 30% тех, кто «забыл записаться».',
    gaze: 'Напоминания о повторном визите и бонусы-рекомендации возвращают клиенток сами — без «слёзных» сообщений.',
    goal: '5+ возвратов в месяц',
  },
]

/** Практическое задание: по одному действию на каждый рычаг */
const ASSIGNMENT_ITEMS = [
  'Наполни базу: добавь в GAZE 3–5 клиенток, с которыми работала на этой неделе (раздел «Клиенты» → «+»).',
  'Подними чек: придумай комплекс «2-в-1» и предложи его следующей клиентке вместо базовой услуги.',
  'Настрой возврат: напиши 3–5 клиенткам, которые давно не были, и предложи записаться (или настрой напоминания).',
]

interface GrowthState {
  done: boolean
  checked: number[]
}

/** Загружаем состояние задания из localStorage */
function loadGrowth(): GrowthState {
  try {
    const raw = localStorage.getItem(GROWTH_KEY)
    if (!raw) return { done: false, checked: [] }
    const s = JSON.parse(raw) as GrowthState
    return { done: Boolean(s.done), checked: Array.isArray(s.checked) ? s.checked : [] }
  } catch {
    return { done: false, checked: [] }
  }
}

function saveGrowth(state: GrowthState): void {
  try {
    localStorage.setItem(GROWTH_KEY, JSON.stringify(state))
  } catch {
    /* localStorage недоступен — состояние живёт в памяти */
  }
}

export default function Growth() {
  const goBack = useAppStore((s) => s.goBack)
  const openPath = useAppStore((s) => s.openPath)

  const [done, setDone] = useState(() => loadGrowth().done)
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    const c: Record<number, boolean> = {}
    loadGrowth().checked.forEach((i) => (c[i] = true))
    return c
  })

  const allChecked = ASSIGNMENT_ITEMS.every((_, i) => checked[i])
  const canSubmit = !done && allChecked

  const toggle = (i: number, value: boolean) => {
    setChecked((c) => {
      const next = { ...c, [i]: value }
      saveGrowth({ done, checked: Object.keys(next).filter((k) => next[Number(k)]).map(Number) })
      return next
    })
  }

  const submit = () => {
    haptic('medium')
    setDone(true)
    saveGrowth({ done: true, checked: Object.keys(checked).filter((k) => checked[Number(k)]).map(Number) })
  }

  return (
    <div className={styles.screen}>
      {/* Шапка */}
      <header className={styles.header}>
        <button className={styles.back} onClick={goBack} aria-label="Назад">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>3 рычага роста</h1>
          <p className={styles.subtitle}>С чего начинается доход 200к</p>
        </div>
        <Badge variant="accent" className={styles.headerBadge}>
          GAZE GROWTH
        </Badge>
      </header>

      {/* Герой: формула дохода */}
      <div className={styles.hero}>
        <span className={styles.heroKicker}>
          <Sparkles size={12} strokeWidth={2.5} />
          СТАРТ ОБУЧЕНИЯ
        </span>
        <h2 className={styles.heroTitle}>Доход мастера — это три множителя</h2>
        <p className={styles.heroSub}>
          Доход = клиенты × средний чек × возвраты. Подними хотя бы один рычаг — и доход вырастет.
          Подними все три — и 200к в месяц перестают быть мечтой.
        </p>
        <div className={styles.formula}>
          <span className={styles.formulaItem}>👥 Клиенты</span>
          <span className={styles.formulaOp}>×</span>
          <span className={styles.formulaItem}>💎 Чек</span>
          <span className={styles.formulaOp}>×</span>
          <span className={styles.formulaItem}>🔁 Возвраты</span>
          <span className={styles.formulaEq}>=</span>
          <span className={styles.formulaResult}>ДОХОД</span>
        </div>
      </div>

      {/* Три рычага — карточки */}
      <h2 className={styles.sectionTitle}>Три рычага</h2>
      <div className={styles.levers}>
        {LEVERS.map((lever) => (
          <Card key={lever.id} className={cx(styles.lever, styles[`lever_${lever.id}`])}>
            <div className={styles.leverHead}>
              <span className={styles.leverNum}>{lever.num}</span>
              <span className={styles.leverEmoji}>{lever.emoji}</span>
            </div>
            <h3 className={styles.leverTitle}>{lever.title}</h3>
            <p className={styles.leverFormula}>{lever.formula}</p>
            <p className={styles.leverDesc}>{lever.desc}</p>
            <div className={styles.leverGaze}>
              <span className={styles.leverGazeLabel}>В GAZE это уже работает</span>
              <span className={styles.leverGazeText}>{lever.gaze}</span>
            </div>
            <div className={styles.leverGoal}>
              <Badge variant="accent">Цель</Badge>
              <span className={styles.leverGoalText}>{lever.goal}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Практическое задание */}
      <section className={cx(styles.assignment, done && styles.assignmentDone)}>
        <div className={styles.assignmentHead}>
          <span className={styles.assignmentIcon}>
            <ClipboardList size={18} strokeWidth={2} />
          </span>
          <div className={styles.assignmentHeadText}>
            <span className={styles.assignmentKicker}>Практика · 15 минут</span>
            <h2 className={styles.assignmentTitle}>📝 Задание: три рычага — три действия</h2>
          </div>
        </div>
        <p className={styles.assignmentTask}>
          Выполни все три шага — по одному на каждый рычаг. Через месяц загляни в аналитику и
          посмотри, как изменились клиенты, средний чек и возвраты.
        </p>
        <div className={styles.assignmentList}>
          {ASSIGNMENT_ITEMS.map((item, i) => (
            <label key={i} className={styles.assignmentItem}>
              <input
                type="checkbox"
                className={styles.assignmentCheck}
                checked={Boolean(checked[i])}
                onChange={(e) => toggle(i, e.target.checked)}
              />
              <span className={styles.assignmentItemText}>{item}</span>
            </label>
          ))}
        </div>
        {done ? (
          <div className={styles.assignmentSuccess}>
            <CheckCircle2 size={16} strokeWidth={2.2} />
            Задание выполнено — все рычаги в деле. Следи за метриками в «Пути роста».
          </div>
        ) : (
          <button className={styles.assignmentBtn} disabled={!canSubmit} onClick={submit}>
            <Check size={16} strokeWidth={2.4} />
            Отметить задание выполненным
          </button>
        )}
      </section>

      {/* CTA: в «Путь роста» */}
      <Button
        fullWidth
        size="lg"
        onClick={() => {
          haptic('medium')
          openPath('knowledge')
        }}
      >
        Перейти к пути роста
        <ArrowRight size={16} strokeWidth={2.2} />
      </Button>
      <p className={styles.hint}>
        «Путь роста» — 6 уровней до 200к+. Система сама передвигает тебя вперёд по реальным
        метрикам: клиенты, чек, возвраты.
      </p>
    </div>
  )
}
