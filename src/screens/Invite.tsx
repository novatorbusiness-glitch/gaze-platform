import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, ExternalLink, Gift, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { botUsername, copyText, haptic } from '../lib/telegram'
import { formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Invite.module.css'

/* ------------------------------------------------------------------ */
/* T6 — ЭКРАН «ПРИГЛАСИТЬ»: QR-код, шаринг, бонусы, история            */
/* ------------------------------------------------------------------ */

/**
 * Реальная механика реферальной программы (совпадает с ботом, TXT["refer_text"]):
 * за каждого приглашённого мастера — +14 дней к доступу курса (25% от месяца).
 * Демо-цифр (invited/earned/history) здесь больше нет — статистика честно по нулям,
 * пока нет реального бэкенда рефералов.
 */
const REFERRAL_BONUS = '+14 дней к курсу'
const REFERRAL_RATE = 25

export default function Invite() {
  const goBack = useAppStore((s) => s.goBack)
  const master = useMasterStore((s) => s.master)
  const isDemo = useMasterStore((s) => s.isDemo)

  // Реальный реферальный код мастера (из Supabase masters.referral_code).
  // В демо-режиме (браузер вне Telegram) реальных данных нет → пусто, без выдуманных цифр.
  const referralCode = !isDemo ? (master?.referral_code ?? '') : ''
  const referralLink = referralCode
    ? `https://t.me/${botUsername()}?start=ref_${referralCode}`
    : ''

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [shared, setShared] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Генерируем QR-код из реферальной ссылки (ведёт на форму доступа к курсу «До 200к»)
  useEffect(() => {
    if (!canvasRef.current || !referralLink) return
    QRCode.toCanvas(
      canvasRef.current,
      referralLink,
      {
        width: 180,
        margin: 1,
        color: { dark: '#2a2521', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) return
      },
    )
  }, [referralLink])

  const onCopyCode = async () => {
    if (!referralCode) return
    await copyText(referralCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1600)
  }

  const onCopyLink = async () => {
    if (!referralLink) return
    await copyText(referralLink)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1600)
  }

  const onShare = async () => {
    if (!referralLink) return
    haptic('medium')
    const shareData = {
      title: 'GAZE — Курс «До 200к»',
      text: 'Привет! Прохожу курс «До 200к» в GAZE — за 6 месяцев с 50–60к до 200к ₽/мес. Попробуй по моей ссылке:',
      url: referralLink,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } else {
        // Fallback: копируем ссылку
        await copyText(referralLink)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* пользователь отменил — тихо */
    }
  }

  return (
    <div className={styles.screen}>
      {/* Шапка с кнопкой «Назад» */}
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
        <span className={styles.headerTitle}>Пригласить друга</span>
      </header>

      {/* Герой-блок: бонус за приглашение */}
      <Card className={styles.heroCard}>
        <div className={styles.heroIcon}>
          <Gift size={24} strokeWidth={2} />
        </div>
        <h1 className={styles.heroTitle}>Пригласи коллегу — получи +14 дней к курсу</h1>
        <p className={styles.heroText}>
          Пригласи коллегу-мастера в GAZE. Когда он оформит доступ к курсу — ты получишь{' '}
          <strong>{REFERRAL_BONUS}</strong> (25% от месяца).
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="cta">{REFERRAL_BONUS}</Badge>
          <Badge variant="accent">{REFERRAL_RATE}% от месяца</Badge>
        </div>
      </Card>

      {/* QR-код */}
      <Card className={styles.qrCard}>
        <canvas ref={canvasRef} className={styles.qrCanvas} />
        <span className={styles.qrHint}>Наведите камеру — откроется курс «До 200к»</span>
      </Card>

      {/* Реферальный код */}
      <div className={styles.codeRow}>
        <span className={styles.code}>{referralCode || '—'}</span>
        <button className={styles.copyBtn} aria-label="Скопировать код" onClick={onCopyCode}>
          <Copy size={15} strokeWidth={1.75} />
          {copiedCode ? 'Готово' : 'Копировать'}
        </button>
      </div>

      {/* Кнопки действий: Поделиться / Скопировать ссылку */}
      <Button fullWidth size="lg" onClick={onShare}>
        <Share2 size={16} strokeWidth={2} />
        {shared ? 'Поделились ✓' : 'Поделиться ссылкой'}
      </Button>
      <Button variant="ghost" fullWidth size="md" onClick={onCopyLink}>
        <ExternalLink size={15} strokeWidth={2} />
        {copiedLink ? 'Ссылка скопирована ✓' : 'Скопировать ссылку'}
      </Button>

      {/* Статистика: приглашено / заработано / активных — реальные нули, без демо-цифр */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>0</span>
          <span className={styles.statLabel}>приглашено</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>0</span>
          <span className={styles.statLabel}>активных</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatMoney(0)}</span>
          <span className={styles.statLabel}>заработано</span>
        </div>
      </div>

      {/* Как это работает: 3 шага */}
      <h2 className={styles.sectionTitle}>Как это работает</h2>
      <div className={styles.steps}>
        <Card className={styles.stepCard}>
          <span className={styles.stepNum}>1</span>
          <div className={styles.stepBody}>
            <span className={styles.stepTitle}>Поделись ссылкой</span>
            <span className={styles.stepText}>
              Отправь коллеге реферальную ссылку или покажи QR-код.
            </span>
          </div>
        </Card>
        <Card className={styles.stepCard}>
          <span className={styles.stepNum}>2</span>
          <div className={styles.stepBody}>
            <span className={styles.stepTitle}>Он оформит доступ к курсу</span>
            <span className={styles.stepText}>
              Друг регистрируется в GAZE по твоей ссылке и активирует доступ к курсу «До 200к».
            </span>
          </div>
        </Card>
        <Card className={styles.stepCard}>
          <span className={styles.stepNum}>3</span>
          <div className={styles.stepBody}>
            <span className={styles.stepTitle}>Получаешь бонус</span>
            <span className={styles.stepText}>
              За каждого приглашённого мастера — {REFERRAL_BONUS} ({REFERRAL_RATE}% от месяца).
            </span>
          </div>
        </Card>
      </div>

      {/* Подсказка: бонус начисляется после оформления доступа к курсу */}
      <p className={styles.hint}>
        Бонус начисляется, когда приглашённый мастер оформит доступ к курсу «До 200к».
      </p>
    </div>
  )
}
