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
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { haptic, hapticSuccess, openSubscriptionPayment } from '../lib/telegram'
import { cx, formatDateLong } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Premium.module.css'

/* ------------------------------------------------------------------ */
/* G2 — ЭКРАН «ПОДПИСКА GAZE»: реальная подписка 990 ₽/мес             */
/* Статус читается из Supabase (masters.subscription_status/end),      */
/* оплата — Telegram Stars через бота (deep-link start=pay),           */
/* после оплаты «Обновить статус» перечитывает мастера.                */
/* ------------------------------------------------------------------ */

const PRICE = 990

/** Что входит в подписку GAZE (990 ₽/мес — полный доступ) */
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

const PLAN_FEATURES = [
  'Учёт клиентов, визитов, доходов и себестоимости',
  'Аналитика, напоминания и возврат клиентов',
  'AI-маркетолог и 15 чит-кодов из книги',
  'Премиум-курсы академии без замков',
  'Премиум-бейдж в сообществе',
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

  /** Оплатить 990 ₽/мес: открываем бота (start=pay) → инвойс Telegram Stars */
  const onPay = () => {
    hapticSuccess()
    openSubscriptionPayment()
    showToast('Открываем оплату в боте…')
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
          Весь GAZE для вашего <em>роста</em>
        </h1>
        <p className={styles.heroSub}>
          Подписка открывает всю платформу: учёт, аналитику, AI-маркетолога,
          премиум-курсы и чит-коды из «Нейро-Воронки».
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="cta">
            <Crown size={11} strokeWidth={2.5} />
            990 ₽/мес
          </Badge>
          {isPremium && <Badge variant="success">активна у вас</Badge>}
          {isTrial && <Badge variant="accent">пробный период</Badge>}
        </div>
      </div>

      {/* Текущий статус подписки */}
      <div className={styles.currentPlan}>
        <div className={styles.currentPlanLabel}>
          <span className={styles.currentPlanTitle}>
            {isPremium
              ? 'Подписка активна'
              : isTrial
                ? 'Пробный период (7 дней)'
                : 'Подписка не активна'}
          </span>
          <span className={styles.currentPlanHint}>
            {isPremium
              ? `Полный доступ до ${subscriptionEnd ? formatDateLong(subscriptionEnd) : '—'}`
              : isTrial
                ? 'Сейчас открыто всё — после триала понадобится подписка'
                : `${PRICE.toLocaleString('ru-RU')} ₽/мес · полный доступ`}
          </span>
        </div>
        {isPremium && <Badge variant="success">PREMIUM ✓</Badge>}
        {isTrial && <Badge variant="accent">TRIAL</Badge>}
        {!isPremium && !isTrial && <Badge variant="accent">доступ закрыт</Badge>}
      </div>

      {/* План (полный доступ, одна цена) */}
      <h2 className={styles.sectionTitle}>Подписка GAZE</h2>
      <div className={cx(styles.plan, styles.planPremium)}>
        <span className={styles.planName}>GAZE Platform</span>
        <div className={styles.planPrice}>
          <span className={styles.planPriceValue}>{PRICE.toLocaleString('ru-RU')}</span>
          <span className={styles.planPricePer}>₽/мес</span>
        </div>
        <span className={styles.planTag}>полный доступ · всё включено</span>
        <ul className={styles.planFeatures}>
          {PLAN_FEATURES.map((f) => (
            <li key={f} className={styles.planFeature}>
              <span className={styles.planFeatureIcon}>
                <Check size={11} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Преимущества */}
      <h2 className={styles.sectionTitle}>Что входит</h2>
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
          {isPremium ? 'Всё открыто у вас ✨' : `Подписка — ${PRICE.toLocaleString('ru-RU')} ₽/мес`}
        </span>
        <span className={styles.ctaCardText}>
          {isPremium
            ? 'AI-маркетолог, премиум-курсы и все чит-коды открыты. Наслаждайтесь ростом!'
            : 'Оплата в один шаг через Telegram Stars — прямо в боте GAZE. Подписка активируется сразу на 30 дней.'}
        </span>
        {isPremium ? (
          <Button size="lg" fullWidth className={styles.btnOnDark} disabled>
            <Crown size={16} strokeWidth={2} />
            Подписка активна ✓
          </Button>
        ) : (
          <Button size="lg" fullWidth className={styles.btnOnDark} onClick={onPay}>
            <Gem size={16} strokeWidth={2} />
            Оплатить {PRICE.toLocaleString('ru-RU')} ₽/мес
          </Button>
        )}
        <Button variant="ghost" size="md" fullWidth className={styles.btnOnDark} onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={15} strokeWidth={2} />
          {refreshing ? 'Обновляем…' : 'Я оплатил — обновить статус'}
        </Button>
        {!isPremium && (
          <Button variant="ghost" size="md" fullWidth className={styles.btnOnDark} onClick={() => navigate('aiMarketer')}>
            <Sparkles size={15} strokeWidth={2} />
            Что даёт AI-маркетолог
          </Button>
        )}
      </div>

      <p className={styles.hint}>
        Оплата проходит в боте GAZE через Telegram Stars (500 ⭐ ≈ 990 ₽). После оплаты вернитесь
        сюда и нажмите «Обновить статус».
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
