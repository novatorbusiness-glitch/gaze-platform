import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Heart, Send } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { addTip, type TipsStats } from '../lib/tips'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './TipsPay.module.css'

/** T16 — Быстрые суммы на странице оплаты */
const QUICK_AMOUNTS = [100, 200, 500]

/**
 * T16 — СТРАНИЦА ОПЛАТЫ (по ссылке из QR-кода):
 * клиент открывает её со своего телефона → выбирает сумму (или свою),
 * вводит имя (необязательно) и жмёт «Отправить чаевые».
 * В демо — имитация: кнопка записывает чаевые в localStorage gaze_tips
 * и показывает экран «Чаевые отправлены ✓».
 */
export default function TipsPay() {
  const goBack = useAppStore((s) => s.goBack)
  const initialAmount = useAppStore((s) => s.tipsAmount)
  const master = useMasterStore((s) => s.master)

  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS.includes(initialAmount) ? initialAmount : 0)
  const [custom, setCustom] = useState(
    QUICK_AMOUNTS.includes(initialAmount) ? '' : String(initialAmount > 0 ? initialAmount : ''),
  )
  const [name, setName] = useState('')
  const [result, setResult] = useState<TipsStats | null>(null)

  const isCustom = amount === 0
  const customAmount = Number(custom)
  const finalAmount = isCustom ? customAmount : amount
  const canSend = finalAmount > 0 && result === null

  const masterName = master?.name ?? 'Мастер'

  const onSend = () => {
    if (!canSend) return
    hapticSuccess()
    setResult(addTip(finalAmount, name))
  }

  /* Успех — «Чаевые отправлены ✓» */
  if (result) {
    const last = result.records[result.records.length - 1]
    return (
      <div className={styles.screen}>
        <Card className={styles.successCard}>
          <span className={styles.successIcon}>
            <CheckCircle2 size={40} strokeWidth={1.75} />
          </span>
          <h1 className={styles.successTitle}>Чаевые отправлены ✓</h1>
          <p className={styles.successSum}>{formatMoney(last.amount)}</p>
          {last.name && last.name !== 'Клиент' && <p className={styles.successName}>от {last.name}</p>}
          <p className={styles.successText}>
            Спасибо! Мастеру <strong>{masterName}</strong> будет очень приятно 💛
          </p>
          <Badge variant="demo">ДЕМО-РЕЖИМ</Badge>
          <Button size="lg" fullWidth className={styles.successBtn} onClick={() => goBack()}>
            Вернуться
          </Button>
        </Card>
      </div>
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
        <h1 className={styles.headerTitle}>Оплата чаевых</h1>
        <Badge variant="demo">DEMO</Badge>
      </header>

      {/* Кому чаевые */}
      <Card className={styles.recipientCard}>
        <span className={styles.recipientIcon}>
          <Heart size={20} strokeWidth={2} />
        </span>
        <div className={styles.recipientBody}>
          <span className={styles.recipientLabel}>Чаевые мастеру</span>
          <span className={styles.recipientName}>{masterName}</span>
        </div>
      </Card>

      {/* Выбор суммы */}
      <section className={styles.form}>
        <h2 className={styles.sectionTitle}>Выберите сумму</h2>
        <div className={styles.chips}>
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              className={cx(styles.chip, amount === value && styles.chipActive)}
              onClick={() => {
                haptic('light')
                setAmount(value)
              }}
              aria-pressed={amount === value}
            >
              {formatMoney(value)}
            </button>
          ))}
          <button
            className={cx(styles.chip, styles.chipCustom, isCustom && styles.chipActive)}
            onClick={() => {
              haptic('light')
              setAmount(0)
            }}
            aria-pressed={isCustom}
          >
            Своя
          </button>
        </div>

        {isCustom && (
          <div className={styles.customRow}>
            <span className={styles.customPrefix}>₽</span>
            <input
              className={styles.customInput}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Сумма чаевых"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Своя сумма чаевых"
            />
          </div>
        )}

        {/* Имя (необязательно) */}
        <label className={styles.field}>
          <span className={styles.label}>Ваше имя (необязательно)</span>
          <input
            className={styles.textInput}
            type="text"
            placeholder="Например, Марина"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
        </label>

        <Button size="lg" fullWidth disabled={!canSend} onClick={onSend}>
          <Send size={16} strokeWidth={2} />
          {canSend ? `Отправить чаевые · ${formatMoney(finalAmount)}` : 'Отправить чаевые'}
        </Button>

        <p className={styles.hint}>
          Демо-имитация оплаты: нажимая «Отправить», вы записываете чаевые в счётчик GAZE
          (localStorage <span className={styles.mono}>gaze_tips</span>).
        </p>
      </section>
    </div>
  )
}
