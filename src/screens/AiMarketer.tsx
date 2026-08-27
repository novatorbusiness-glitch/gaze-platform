import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Crown,
  Lock,
  MessageSquareText,
  Package,
  Sparkles,
  SquarePen,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input } from '../components/Input'
import {
  generateContent,
  NEURO_CHEATS,
  type ContentType,
  type GeneratedVariant,
  type Tone,
} from '../lib/aiMarketer'
import { copyText, haptic, hapticSuccess } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './AiMarketer.module.css'

/* ------------------------------------------------------------------ */
/* G2 — ЭКРАН «AI-МАРКЕТОЛОГ»: генератор контента по «Нейро-Воронке»   */
/* ------------------------------------------------------------------ */

const CONTENT_TYPES: Array<{ id: ContentType; label: string; emoji: string }> = [
  { id: 'post', label: 'Пост', emoji: '📝' },
  { id: 'stories', label: 'Сторис', emoji: '📱' },
  { id: 'offer', label: 'Оффер', emoji: '🎁' },
  { id: 'script', label: 'Скрипт ответа', emoji: '💬' },
]

const TONES: Array<{ id: Tone; label: string; emoji: string }> = [
  { id: 'friendly', label: 'Дружелюбный', emoji: '😊' },
  { id: 'expert', label: 'Экспертный', emoji: '🎓' },
  { id: 'playful', label: 'Игривый', emoji: '🎉' },
]

/** Группировка 15 чит-кодов по категориям книги */
const CHEAT_GROUPS = NEURO_CHEATS.reduce<Record<string, typeof NEURO_CHEATS>>((acc, c) => {
  ;(acc[c.category] ??= []).push(c)
  return acc
}, {})

function VariantCard({ variant }: { variant: GeneratedVariant }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    await copyText(variant.text)
    hapticSuccess()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <Card className={styles.variant}>
      <div className={styles.variantHead}>
        <span className={styles.variantLabel}>{variant.label}</span>
        <button
          className={cx(styles.copyBtn, copied && styles.copyBtnDone)}
          onClick={onCopy}
          aria-label={`Скопировать вариант «${variant.label}»`}
        >
          {copied ? <Check size={13} strokeWidth={2.5} /> : <ClipboardCopy size={13} strokeWidth={2} />}
          {copied ? 'Скопировано' : 'Скопировать'}
        </button>
      </div>
      <p className={styles.variantText}>{variant.text}</p>
    </Card>
  )
}

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
        Доступно по подписке GAZE (990 ₽/мес). Генератор пишет посты, сторис, офферы и скрипты
        ответов по формуле «Нейро-Воронки» — 3-4 готовых варианта на выбор.
      </p>
      <ul className={styles.lockFeatures}>
        {[
          'Посты для соцсетей по формуле «крючок → боль → решение → оффер → CTA»',
          'Сторис, офферы и скрипты ответов клиентам',
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
          Оплатить подписку — 990 ₽/мес
        </Button>
        <p className={styles.lockHint}>
          Подписка GAZE открывает всю платформу: AI-маркетолог, премиум-курсы и все чит-коды.
        </p>
      </div>
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

  const [type, setType] = useState<ContentType>('post')
  const [tone, setTone] = useState<Tone>('friendly')
  const [service, setService] = useState('')
  const [pain, setPain] = useState('')
  const [variants, setVariants] = useState<GeneratedVariant[] | null>(null)

  const onGenerate = () => {
    hapticSuccess()
    setVariants(
      generateContent({
        type,
        tone,
        service: service || 'процедура',
        pain: pain || 'кому неудобно или некогда ходить в салон',
      }),
    )
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
              Напишите свою услугу и боль клиенток — получите готовые тексты
              по формуле «Нейро-Воронки»: крючок → боль → решение → оффер → CTA.
            </p>
            <div className={styles.heroBadges}>
              <Badge variant="cta">
                <Crown size={11} strokeWidth={2.5} />
                PREMIUM
              </Badge>
              <Badge variant="success">активен у вас</Badge>
            </div>
          </div>

          {/* Форма */}
          <Card className={styles.formCard}>
            <div>
              <span className={styles.fieldLabel}>Тип контента</span>
              <div className={styles.chips}>
                {CONTENT_TYPES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={cx(styles.chip, type === c.id && styles.chipActive)}
                    onClick={() => {
                      haptic('light')
                      setType(c.id)
                    }}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Твоя услуга"
              placeholder="Например, маникюр"
              value={service}
              onChange={(e) => setService(e.target.value)}
              maxLength={60}
            />
            <Input
              label="Боль или аудитория"
              placeholder="Например, клиентки, которым неудобно ходить в салон"
              value={pain}
              onChange={(e) => setPain(e.target.value)}
              maxLength={120}
            />

            <div>
              <span className={styles.fieldLabel}>Тон</span>
              <div className={styles.chips}>
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={cx(styles.chip, tone === t.id && styles.chipActive)}
                    onClick={() => {
                      haptic('light')
                      setTone(t.id)
                    }}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Button size="lg" fullWidth onClick={onGenerate}>
              <Sparkles size={16} strokeWidth={2} />
              Сгенерировать
            </Button>
          </Card>

          {/* Результаты */}
          {variants && (
            <section aria-label="Сгенерированные варианты">
              <h2 className={styles.sectionTitle}>
                <SquarePen size={16} strokeWidth={2.2} />
                {variants.length} варианта готовы
                <span className={styles.sectionMeta}>
                  {CONTENT_TYPES.find((c) => c.id === type)?.label.toLowerCase()}
                </span>
              </h2>
              <div className={styles.variantList}>
                {variants.map((v, i) => (
                  <VariantCard key={`${type}-${i}`} variant={v} />
                ))}
              </div>
            </section>
          )}
          {!variants && (
            <Card className={styles.emptyState}>
              <Sparkles size={26} strokeWidth={1.5} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Заполните форму и нажмите «Сгенерировать»</p>
              <p className={styles.emptyText}>
                AI-маркетолог подставит вашу услугу и боль аудитории в формулу
                «Нейро-Воронки» и соберёт 4 варианта: пост, сторис, оффер или скрипт.
              </p>
            </Card>
          )}

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
