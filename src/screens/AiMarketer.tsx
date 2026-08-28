import {
  ArrowLeft,
  Check,
  Crown,
  Lock,
  MessageSquareText,
  Package,
  Send,
  Sparkles,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { NEURO_CHEATS } from '../lib/aiMarketer'
import { haptic, openAiMarketerBot } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import styles from './AiMarketer.module.css'

/* ------------------------------------------------------------------ */
/* G2 — ЭКРАН «AI-МАРКЕТОЛОГ»: генератор перенесён В TELEGRAM-БОТА.     */
/* Здесь — лендинг с кнопкой «Открыть в боте» (deep-link start=ai_marketer) */
/* ------------------------------------------------------------------ */

/** Группировка 15 чит-кодов по категориям книги */
const CHEAT_GROUPS = NEURO_CHEATS.reduce<Record<string, typeof NEURO_CHEATS>>((acc, c) => {
  ;(acc[c.category] ??= []).push(c)
  return acc
}, {})

/* ------------------------------------------------------------------ */
/* Замок для базового тарифа                                           */
/* ------------------------------------------------------------------ */

function PremiumLock() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <Card className={styles.lock}>
      <span className={styles.lockIcon}>
        <Lock size={26} strokeWidth={1.75} />
      </span>
      <h2 className={styles.lockTitle}>AI-маркетолог</h2>
      <p className={styles.lockText}>
        Доступно по премиум-тарифу GAZE (1 500 ₽/мес). Генератор пишет посты, сторис, офферы,
        приветствия новым клиентам и скрипты ответов по формуле «Нейро-Воронки» —
        прямо в Telegram-боте.
      </p>
      <ul className={styles.lockFeatures}>
        {[
          'Посты для соцсетей по формуле «крючок → боль → решение → оффер → CTA»',
          'Офферы, приветствия новым клиентам и скрипты ответов',
          '15 чит-кодов из книги «Нейро-Воронка»',
        ].map((f) => (
          <li key={f} className={styles.lockFeature}>
            <span className={styles.lockFeatureIcon}>
              <Check size={11} strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className={styles.lockCta}>
        <Button size="lg" fullWidth onClick={() => navigate('premium')}>
          <Crown size={16} strokeWidth={2} />
          Оплатить тариф — 1 500 ₽/мес
        </Button>
        <p className={styles.lockHint}>
          Премиум-тариф «AI-маркетолог» открывает генератор контента, все чит-коды и премиум-курсы.
        </p>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Карточка «Открыть в боте»                                           */
/* ------------------------------------------------------------------ */

function OpenInBotCard() {
  return (
    <Card className={styles.botCard}>
      <span className={styles.botCardIcon}>
        <Send size={22} strokeWidth={1.75} />
      </span>
      <h2 className={styles.botCardTitle}>AI-маркетолог работает в Telegram-боте</h2>
      <p className={styles.botCardText}>
        Генерация перенесена прямо в чат с ботом GAZE — открываем, выбираем тип
        (пост, сторис, оффер, контент-план, картинка), пишем тему и получаем готовые
        тексты и картинки сразу в переписке.
      </p>
      <ul className={styles.botCardSteps}>
        <li>1️⃣ Жмёшь «Открыть в боте» — чат с @gaze_arch_bot</li>
        <li>2️⃣ Выбираешь тип контента и пишешь тему (услуга + боль)</li>
        <li>3️⃣ Получаешь 4 готовых варианта — копируй и публикуй</li>
      </ul>
      <Button size="lg" fullWidth onClick={() => { haptic('medium'); openAiMarketerBot() }}>
        <Send size={16} strokeWidth={2} />
        Открыть AI-маркетолога в боте
      </Button>
      <p className={styles.botCardHint}>
        Лимит — 30 запросов в неделю на мастера. Остаток показывает бот в меню.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Экран                                                               */
/* ------------------------------------------------------------------ */

export default function AiMarketer() {
  const goBack = useAppStore((s) => s.goBack)
  const plan = useAppStore((s) => s.plan)
  const navigate = useAppStore((s) => s.navigate)
  const isPremium = plan === 'premium'

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
        <span className={styles.headerTitle}>AI-маркетолог</span>
      </header>

      {!isPremium ? (
        <PremiumLock />
      ) : (
        <>
          {/* Герой */}
          <div className={styles.hero}>
            <div className={styles.heroGlow} />
            <span className={styles.heroKicker}>
              <Sparkles size={12} strokeWidth={2.5} />
              GAZE PREMIUM
            </span>
            <h1 className={styles.heroTitle}>AI-маркетолог</h1>
            <p className={styles.heroSub}>
              Готовые посты, сторис, офферы и контент-планы по формуле «Нейро-Воронки»:
              крючок → боль → решение → оффер → CTA. И картинки для соцсетей.
              Всё — прямо в Telegram-боте.
            </p>
            <div className={styles.heroBadges}>
              <Badge variant="cta">
                <Crown size={11} strokeWidth={2.5} />
                PREMIUM
              </Badge>
              <Badge variant="success">активен у вас</Badge>
            </div>
          </div>

          {/* Открыть в боте */}
          <OpenInBotCard />

          {/* Чит-коды из книги */}
          <section aria-label="Чит-коды из книги «Нейро-Воронка»">
            <h2 className={styles.sectionTitle}>
              <MessageSquareText size={16} strokeWidth={2.2} />
              15 чит-кодов из «Нейро-Воронки»
              <span className={styles.sectionMeta}>карточки-подсказки</span>
            </h2>
            <div className={styles.cheatList}>
              {Object.entries(CHEAT_GROUPS).map(([category, cards]) => (
                <div key={category} className={styles.cheatGroup}>
                  <span className={styles.cheatGroupTitle}>{category}</span>
                  {cards.map((c) => (
                    <Card key={c.id} className={styles.cheat}>
                      <span className={styles.cheatNum}>
                        <Package size={11} strokeWidth={2.2} />
                      </span>
                      <span className={styles.cheatBody}>
                        <span className={styles.cheatTitle}>{c.title}</span>
                        <span className={styles.cheatText}>{c.text}</span>
                      </span>
                    </Card>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <Button variant="ghost" fullWidth onClick={() => navigate('premium')}>
            Управлять тарифом Премиум
          </Button>
        </>
      )}
    </div>
  )
}
