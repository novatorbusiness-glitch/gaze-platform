import { Check, ChevronRight, PenLine, Sparkles, UserPlus } from 'lucide-react'
import Card from './Card'
import { isOnboardingComplete, onboardingProgress, type OnboardingState, type OnboardingStep } from '../lib/onboarding'
import { cx } from '../lib/utils'
import styles from './OnboardingQuest.module.css'

interface OnboardingQuestProps {
  /** Текущий прогресс квеста (из localStorage gaze_onboarding) */
  state: OnboardingState
  /** Клик по шагу: «client»/«procedure» — навигация на форму, «insight» — скролл к блоку */
  onStep: (step: OnboardingStep) => void
}

const STEPS: Array<{ key: OnboardingStep; icon: typeof UserPlus; title: string; hint: string }> = [
  { key: 'client', icon: UserPlus, title: 'Добавь первого клиента', hint: 'Заведи карточку — начнётся история визитов' },
  { key: 'procedure', icon: PenLine, title: 'Запиши первую процедуру', hint: 'Доход за месяц и средний чек оживут' },
  { key: 'insight', icon: Sparkles, title: 'Открой инсайты', hint: 'Блок «Кого вернуть» подскажет, кому написать' },
]

/**
 * T3 — онбординг-квест «Начни с 3 шагов» (эффект владения / ИКЕА).
 * Пока шаги не завершены — карточка с чек-листом и прогрессом.
 * Когда все 3 сделаны — компактное «Вы в деле! 🎉».
 */
export default function OnboardingQuest({ state, onStep }: OnboardingQuestProps) {
  const done = isOnboardingComplete(state)
  const progress = onboardingProgress(state)

  if (done) {
    return (
      <Card className={styles.doneCard}>
        <span className={styles.doneEmoji} aria-hidden="true">
          🎉
        </span>
        <div className={styles.doneTextWrap}>
          <p className={styles.doneTitle}>Вы в деле!</p>
          <p className={styles.doneText}>
            Платформа уже работает на тебя — заглядывай в инсайты и возвращай клиентов.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={styles.quest}>
      {/* Шапка квеста */}
      <div className={styles.questHeader}>
        <div className={styles.questHeading}>
          <p className={styles.questKicker}>Твой старт</p>
          <h2 className={styles.questTitle}>Начни с 3 шагов</h2>
        </div>
        <span className={styles.questCount}>
          {progress} / 3
        </span>
      </div>

      {/* Тонкий прогресс-бар (blush → warm) */}
      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={progress}>
        <div
          className={styles.progressFill}
          style={{ width: `${(progress / 3) * 100}%` }}
        />
      </div>

      {/* Чек-лист шагов */}
      <div className={styles.stepList}>
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const checked = Boolean(state[step.key])
          return (
            <button
              key={step.key}
              type="button"
              className={styles.step}
              onClick={() => onStep(step.key)}
              aria-checked={checked}
              role="checkbox"
            >
              <span className={cx(styles.check, checked && styles.checkDone)}>
                {checked ? <Check size={13} strokeWidth={3} /> : <span className={styles.checkNum}>{index + 1}</span>}
              </span>
              <span className={styles.stepBody}>
                <span className={cx(styles.stepTitle, checked && styles.stepTitleDone)}>{step.title}</span>
                <span className={styles.stepHint}>{step.hint}</span>
              </span>
              <Icon size={18} strokeWidth={1.5} className={styles.stepIcon} />
              <ChevronRight size={16} strokeWidth={2} className={styles.chevron} />
            </button>
          )
        })}
      </div>

      <p className={styles.questNote}>
        Три шага — и платформа начнёт работать на тебя ✨
      </p>
    </Card>
  )
}
