import { useRef, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Crown,
  GraduationCap,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import {
  haptic,
  hapticSuccess,
  openSubscriptionPayment,
  type GazePlan,
} from '../lib/telegram'
import { cx, formatDateLong } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Premium.module.css'

/* ------------------------------------------------------------------ */
/* G2 — ЭКРАН «ПОДПИСКА GAZE»: два тарифа.                             */
/*                                                                     */
/*   Базовый  — 990 ₽/мес: курс «До 200к» (30 уроков, 6 мес,          */
/*              рост 50–60к → 200к/мес), задания, прогресс,           */
/*              сертификаты, 15 чит-кодов из «Нейро-Воронки».          */
/*   Премиум  — 1 500 ₽/мес: всё из базового + AI-маркетолог,         */
/*              премиум-бейдж, приоритетная поддержка.                */
/*                                                                     */
/* Оплата — Telegram Stars через бота (deep-link start=pay_basic /    */
/* start=pay_premium). После оплаты «Я оплатил — обновить статус»      */
/* перечитывает мастера и применяет подписку.                          */
/* ------------------------------------------------------------------ */

interface Tier {
  id: GazePlan
  name: string
  tag: string
  price: number
  icon: LucideIcon
  desc: string
  features: string[]
  payLabel: string
  highlighted?: boolean
}

const TIERS: Tier[] = [
  {
    id: 'basic',
    name: 'Базовый · Курс «До 200к»',
    tag: 'старт роста',
    price: 990,
    icon: GraduationCap,
    desc: 'Полный курс GAZE: 30 уроков за 6 месяцев — рост дохода с 50–60 до 200 тыс. ₽/мес. Задания, прогресс и сертификаты в платформе.',
    features: [
      'Курс «До 200к» — 30 уроков за 6 месяцев',
      'Задания после каждого урока и прогресс',
      'Сертификаты за модули и итоговый',
      '15 чит-кодов из книги «Нейро-Воронка»',
    ],
    payLabel: 'Оплатить 990 ₽/мес',
  },
  {
    id: 'premium',
    name: 'Премиум · AI-маркетолог',
    tag: 'всё включено',
    price: 1500,
    icon: Crown,
    desc: 'Всё из базового тарифа плюс личный AI-маркетолог: пишет посты, сторис, контент-план и офферы за вас.',
    features: [
      'Всё из тарифа «Базовый»: курс, задания, прогресс, сертификаты, чит-коды',
      'AI-маркетолог: посты, сторис, контент-план и офферы',
      'Премиум-бейдж в профиле и сообществе',
      'Приоритетная поддержка',
    ],
    payLabel: 'Оплатить 1 500 ₽/мес',
    highlighted: true,
  },
]

export default function Premium() {
  const goBack = useAppStore((s) => s.goBack)
  const navigate = useAppStore((s) => s.navigate)
  const plan = useAppStore((s) => s.plan)
  const subscriptionStatus = useAppStore((s) => s.subscriptionStatus)
  const subscriptionEnd = useAppStore((s) => s.subscriptionEnd)
  const initMaster = useMasterStore((s) => s.init)

  const isPremium = plan === 'premium'
  const isTrial = subscriptionStatus === 'trial'

  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)
  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2400)
  }

  /** Оплатить выбранный тариф: открываем бота (start=pay_basic / start=pay_premium) → инвойс Telegram Stars */
  const onPay = (tier: GazePlan) => {
    hapticSuccess()
    openSubscriptionPayment(tier)
    showToast(tier === 'premium' ? 'Открываем оплату премиума…' : 'Открываем оплату базового…')
  }

  /** После оплаты — перечитать мастера из Supabase и обновить статус */
  const onRefresh = async () => {
    haptic('medium')
    setRefreshing(true)
    try {
      await initMaster(true)
      showToast(useAppStore.getState().plan === 'premium' ? 'Подписка активна ✨' : 'Статус обновлён')
    } catch {
      showToast('Не удалось обновить статус')
    } finally {
      setRefreshing(false)
    }
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
        <span className={styles.headerTitle}>Подписка</span>
      </header>

      {/* Герой */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroKicker}>
          <Sparkles size={12} strokeWidth={2.5} />
          GAZE PLATFORM
        </span>
        <h1 className={styles.heroTitle}>
          Растите с GAZE: <em>два тарифа</em>
        </h1>
        <p className={styles.heroSub}>
          Базовый — курс «До 200к»: 30 уроков за 6 месяцев и рост дохода до 200 тыс. ₽/мес.
          Премиум — всё то же плюс личный AI-маркетолог, который пишет контент за вас.
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="accent">Базовый · 990 ₽/мес</Badge>
          <Badge variant="cta">Премиум · 1 500 ₽/мес</Badge>
          {isPremium && <Badge variant="success">активен у вас</Badge>}
          {isTrial && <Badge variant="accent">пробный период</Badge>}
        </div>
      </div>

      {/* Текущий статус подписки */}
      <div className={styles.currentPlan}>
        <div className={styles.currentPlanLabel}>
          <span className={styles.currentPlanTitle}>
            {isPremium
              ? 'Премиум активен'
              : isTrial
                ? 'Пробный период (7 дней)'
                : 'Тариф не активен'}
          </span>
          <span className={styles.currentPlanHint}>
            {isPremium
              ? `Полный доступ до ${subscriptionEnd ? formatDateLong(subscriptionEnd) : '—'}`
              : isTrial
                ? 'Сейчас открыто всё — после триала выберите тариф'
                : 'Выберите тариф ниже и оплатите в один шаг'}
          </span>
        </div>
        {isPremium && <Badge variant="success">PREMIUM ✓</Badge>}
        {isTrial && <Badge variant="accent">TRIAL</Badge>}
        {!isPremium && !isTrial && <Badge variant="accent">доступ закрыт</Badge>}
      </div>

      {/* Два тарифа */}
      <h2 className={styles.sectionTitle}>Выберите тариф</h2>
      <div className={styles.tiers}>
        {TIERS.map((tier) => {
          const Icon = tier.icon
          return (
            <div
              key={tier.id}
              className={cx(styles.tier, tier.highlighted && styles.tierPremium)}
            >
              <div className={styles.tierHead}>
                <span className={styles.tierIcon}>
                  <Icon size={19} strokeWidth={2} />
                </span>
                <div className={styles.tierHeadText}>
                  <span className={styles.tierName}>{tier.name}</span>
                  <span className={styles.tierTag}>{tier.tag}</span>
                </div>
              </div>

              <div className={styles.tierPrice}>
                <span className={styles.tierPriceValue}>
                  {tier.price.toLocaleString('ru-RU')}
                </span>
                <span className={styles.tierPricePer}>₽/мес</span>
              </div>

              <p className={styles.tierDesc}>{tier.desc}</p>

              <ul className={styles.tierFeatures}>
                {tier.features.map((f) => (
                  <li key={f} className={styles.tierFeature}>
                    <span className={styles.tierFeatureIcon}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                fullWidth
                className={tier.highlighted ? styles.tierBtnPremium : styles.tierBtn}
                onClick={() => onPay(tier.id)}
                disabled={isPremium}
              >
                {tier.id === 'premium' ? (
                  <Crown size={16} strokeWidth={2} />
                ) : (
                  <BookOpen size={16} strokeWidth={2} />
                )}
                {isPremium ? 'Премиум активен ✓' : tier.payLabel}
              </Button>
            </div>
          )
        })}
      </div>

      {/* Действия после оплаты */}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={15} strokeWidth={2} />
          {refreshing ? 'Обновляем…' : 'Я оплатил — обновить статус'}
        </Button>
        {!isPremium && (
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => navigate('aiMarketer')}
          >
            <Sparkles size={15} strokeWidth={2} />
            Что даёт AI-маркетолог
          </Button>
        )}
      </div>

      <p className={styles.hint}>
        Оплата проходит в боте GAZE через Telegram Stars: 500 ⭐ ≈ 990 ₽, 750 ⭐ ≈ 1 500 ₽.
        После оплаты вернитесь сюда и нажмите «Я оплатил — обновить статус».
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
