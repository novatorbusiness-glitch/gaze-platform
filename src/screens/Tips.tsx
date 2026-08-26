import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, Check, Copy, ExternalLink, Heart, Smartphone } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { demoClients } from '../lib/dev-data'
import { buildTipLink } from '../lib/tips'
import { copyText, haptic } from '../lib/telegram'
import { cx, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Tips.module.css'

/** T16 — Быстрые суммы чаевых (клиент выбирает готовый вариант) */
const QUICK_AMOUNTS = [100, 200, 500]

/** Текст, который видит клиентка рядом с QR */
const CLIENT_TEXT = 'Спасибо за визит! Если хочешь — чаевые можно оставить здесь 💛'

/**
 * T16 — ЭКРАН «ЧАЕВЫЕ» (QR):
 * мастер после визита показывает QR-код клиенту → клиент сканирует →
 * открывается страница оплаты (выбор суммы / своя, имя, «Отправить» — демо).
 */
export default function Tips() {
  const goBack = useAppStore((s) => s.goBack)
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const openTipsPay = useAppStore((s) => s.openTipsPay)
  const master = useMasterStore((s) => s.master)
  const isDemo = useMasterStore((s) => s.isDemo)

  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[0])
  const [custom, setCustom] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

  const client = useMemo(
    () => (selectedClientId ? demoClients.find((c) => c.id === selectedClientId) ?? null : null),
    [selectedClientId],
  )

  const masterName = master?.name ?? 'Мастер'
  const masterId = master?.id ?? 'demo-master'

  /** Ссылка на оплату, которую кодирует QR (в демо — gaze.tips/pay) */
  const payLink = useMemo(() => buildTipLink(masterId, selectedClientId), [masterId, selectedClientId])

  /** Генерируем настоящий сканируемый QR-код через библиотеку qrcode */
  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(payLink, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: 'M',
      color: { dark: '#2a2521', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [payLink])

  const isCustom = amount === 0
  const customAmount = Number(custom)
  const finalAmount = isCustom ? customAmount : amount
  const canOpenPay = finalAmount > 0

  const onCopyLink = async () => {
    haptic('light')
    await copyText(payLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const openPay = () => {
    if (!canOpenPay) return
    haptic('medium')
    openTipsPay(finalAmount)
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
        <h1 className={styles.headerTitle}>Чаевые</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </header>

      {/* Текст для клиента */}
      <Card className={styles.heroCard}>
        <span className={styles.heroIcon}>
          <Heart size={22} strokeWidth={2} />
        </span>
        <p className={styles.heroText}>{CLIENT_TEXT}</p>
        <p className={styles.heroName}>
          От мастера — <strong>{masterName}</strong>
          {client ? ` · для ${client.name.split(' ')[0]}` : ''}
        </p>
      </Card>

      {/* QR-код */}
      <Card className={styles.qrCard}>
        <div className={styles.qrWrap}>
          {qrUrl ? (
            <img className={styles.qrImg} src={qrUrl} alt="QR-код для чаевых" width={260} height={260} />
          ) : (
            <div className={styles.qrPlaceholder} aria-hidden="true">
              <span className={styles.qrPlaceholderIcon}>🔳</span>
              <span className={styles.qrPlaceholderText}>QR загружается…</span>
            </div>
          )}
        </div>
        <p className={styles.qrHint}>
          <Smartphone size={13} strokeWidth={2} />
          Клиентка сканирует камерой телефона — откроется страница оплаты
        </p>
        <button className={styles.linkBtn} onClick={onCopyLink}>
          <span className={styles.linkText}>
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} /> Скопировано ✓
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2} /> {payLink}
              </>
            )}
          </span>
        </button>
      </Card>

      {/* Быстрые суммы */}
      <section className={styles.amounts}>
        <h2 className={styles.sectionTitle}>Предложи сумму</h2>
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
            Своя сумма
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
              placeholder="Например, 300"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Своя сумма чаевых"
            />
          </div>
        )}

        <Button size="lg" fullWidth disabled={!canOpenPay} onClick={openPay}>
          <ExternalLink size={16} strokeWidth={2} />
          Открыть страницу оплаты {canOpenPay ? `· ${formatMoney(finalAmount)}` : ''}
        </Button>
        <p className={styles.hint}>
          В демо-режиме кнопка открывает страницу оплаты внутри приложения — «Отправить» запишет чаевые в
          счётчик (localStorage <span className={styles.mono}>gaze_tips</span>).
        </p>
      </section>
    </div>
  )
}
