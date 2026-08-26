import { useRef, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Bot,
  Check,
  Crown,
  Gem,
  GraduationCap,
  MessageSquareText,
  Sparkles,
  X,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Premium.module.css'

/* ------------------------------------------------------------------ */
/* G2 — ЭКРАН «ПРЕМИУМ»: сравнение тарифов, преимущества, переход       */
/* ------------------------------------------------------------------ */

const BASE_PRICE = 990
const PREMIUM_PRICE = 1500

/** Преимущества премиума (для карточек-списка) */
const BENEFITS = [
  {
    icon: Bot,
    title: 'AI-маркетолог',
    text: 'Пишет посты, сторис, офферы и скрипты ответов по формуле «Нейро-Воронки» — 3-4 варианта на выбор.',
  },
  {
    icon: GraduationCap,
    title: 'Премиум-курсы академии',
    text: 'Продвинутые курсы по продажам и среднему чеку — открываются без замков.',
  },
  {
    icon: BookOpen,
    title: '15 чит-кодов из книги',
    text: '«Нейро-Воронка»: нейромаркетинг, воронки, доверие, нейро-трафик и автоматизация — карточки-подсказки.',
  },
  {
    icon: BadgeCheck,
    title: 'Премиум-бейдж',
    text: 'Отметка «PREMIUM» в профиле и в сообществе мастеров GAZE.',
  },
  {
    icon: MessageSquareText,
    title: 'Приоритетная поддержка',
    text: 'Отвечаем быстрее и разбираем задачи роста вместе.',
  },
]

/** Строка сравнения тарифов: базовая фича / премиум-фича */
const COMPARE_ROWS: Array<{ label: string; base: boolean; premium: boolean }> = [
  { label: 'Все функции платформы GAZE', base: true, premium: true },
  { label: 'Учёт клиентов и визитов', base: true, premium: true },
  { label: 'Аналитика и напоминания', base: true, premium: true },
  { label: 'AI-маркетолог', base: false, premium: true },
  { label: 'Премиум-курсы академии', base: false, premium: true },
  { label: '15 чит-кодов из «Нейро-Воронки»', base: false, premium: true },
  { label: 'Премиум-бейдж в сообществе', base: false, premium: true },
  { label: 'Приоритетная поддержка', base: false, premium: true },
]

function FeatureMark({ on }: { on: boolean }) {
  return (
    <span className={cx(styles.planFeatureIcon, !on && styles.planFeatureIconOff)}>
      {on ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={2.5} />}
    </span>
  )
}

export default function Premium() {
  const goBack = useAppStore((s) => s.goBack)
  const plan = useAppStore((s) => s.plan)
  const setPlan = useAppStore((s) => s.setPlan)

  const isPremium = plan === 'premium'

  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const onUpgrade = () => {
    hapticSuccess()
    setPlan('premium')
    showToast('Премиум активирован ✨')
  }

  const onDowngrade = () => {
    haptic('medium')
    setPlan('base')
    showToast('Возвращено на тариф «Базовый»')
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
        <span className={styles.headerTitle}>Премиум</span>
      </header>

      {/* Герой */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroKicker}>
          <Sparkles size={12} strokeWidth={2.5} />
          GAZE PREMIUM
        </span>
        <h1 className={styles.heroTitle}>
          Больше, чем учёт — <em>ваш AI-маркетолог</em>
        </h1>
        <p className={styles.heroSub}>
          Готовые тексты для постов, сторис и офферов по формуле «Нейро-Воронки»,
          премиум-курсы и чит-коды из книги — всё для роста вашего дохода.
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="cta">
            <Crown size={11} strokeWidth={2.5} />
            PREMIUM
          </Badge>
          {isPremium && <Badge variant="success">активен у вас</Badge>}
        </div>
      </div>

      {/* Текущий тариф */}
      <div className={styles.currentPlan}>
        <div className={styles.currentPlanLabel}>
          <span className={styles.currentPlanTitle}>
            Ваш тариф: {isPremium ? 'Премиум' : 'Базовый'}
          </span>
          <span className={styles.currentPlanHint}>
            {isPremium
              ? `${PREMIUM_PRICE.toLocaleString('ru-RU')} ₽/мес · всё открыто`
              : `${BASE_PRICE.toLocaleString('ru-RU')} ₽/мес · без AI-маркетолога`}
          </span>
        </div>
        <Badge variant={isPremium ? 'success' : 'accent'}>
          {isPremium ? 'PREMIUM ✓' : 'Базовый'}
        </Badge>
      </div>

      {/* Сравнение тарифов */}
      <h2 className={styles.sectionTitle}>Сравнение тарифов</h2>
      <div className={styles.compare}>
        <div className={styles.plan}>
          <span className={styles.planName}>Базовый</span>
          <div className={styles.planPrice}>
            <span className={styles.planPriceValue}>{BASE_PRICE.toLocaleString('ru-RU')}</span>
            <span className={styles.planPricePer}>₽/мес</span>
          </div>
          <span className={styles.planTag}>всё для учёта</span>
          <ul className={styles.planFeatures}>
            {COMPARE_ROWS.map((row) => (
              <li key={row.label} className={styles.planFeature}>
                <FeatureMark on={row.base} />
                {row.label}
              </li>
            ))}
          </ul>
        </div>

        <div className={cx(styles.plan, styles.planPremium)}>
          <span className={styles.planName}>Премиум</span>
          <div className={styles.planPrice}>
            <span className={styles.planPriceValue}>{PREMIUM_PRICE.toLocaleString('ru-RU')}</span>
            <span className={styles.planPricePer}>₽/мес</span>
          </div>
          <span className={styles.planTag}>+ AI-маркетолог</span>
          <ul className={styles.planFeatures}>
            {COMPARE_ROWS.map((row) => (
              <li key={row.label} className={styles.planFeature}>
                <FeatureMark on={row.premium} />
                {row.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Преимущества */}
      <h2 className={styles.sectionTitle}>Что входит в Премиум</h2>
      <div className={styles.benefits}>
        {BENEFITS.map((b) => {
          const Icon = b.icon
          return (
            <div key={b.title} className={styles.benefit}>
              <span className={styles.benefitIcon}>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className={styles.benefitBody}>
                <span className={styles.benefitTitle}>{b.title}</span>
                <span className={styles.benefitText}>{b.text}</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className={styles.ctaCard}>
        <span className={styles.ctaCardTitle}>
          {isPremium ? 'Премиум активен у вас ✨' : 'Перейти на Премиум'}
        </span>
        <span className={styles.ctaCardText}>
          {isPremium
            ? 'AI-маркетолог, премиум-курсы и все чит-коды открыты. Наслаждайтесь ростом!'
            : `Всё из базового тарифа + AI-маркетолог и премиум-курсы за ${PREMIUM_PRICE.toLocaleString('ru-RU')} ₽/мес.`}
        </span>
        <Button size="lg" fullWidth className={styles.btnOnDark} disabled={isPremium} onClick={onUpgrade}>
          <Gem size={16} strokeWidth={2} />
          {isPremium ? 'Премиум активен ✓' : `Перейти на Премиум — ${PREMIUM_PRICE.toLocaleString('ru-RU')} ₽/мес`}
        </Button>
        {isPremium && (
          <Button variant="ghost" size="md" fullWidth className={styles.btnOnDark} onClick={onDowngrade}>
            Вернуться на тариф «Базовый» (990 ₽/мес)
          </Button>
        )}
      </div>

      <p className={styles.hint}>
        Демо-режим: оплата не выполняется, тариф переключается сразу и сохраняется на этом устройстве.
      </p>

      {/* Тост */}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
