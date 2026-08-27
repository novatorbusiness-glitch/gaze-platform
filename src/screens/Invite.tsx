import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, ExternalLink, Gift, Share2, Users } from 'lucide-react'
import QRCode from 'qrcode'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { demoReferral } from '../lib/dev-data'
import { copyText, haptic } from '../lib/telegram'
import { cx, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Invite.module.css'

/* ------------------------------------------------------------------ */
/* T6 — ЭКРАН «ПРИГЛАСИТЬ»: QR-код, шаринг, бонусы, история            */
/* ------------------------------------------------------------------ */

export default function Invite() {
  const goBack = useAppStore((s) => s.goBack)

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [shared, setShared] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Генерируем QR-код из реферальной ссылки
  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(
      canvasRef.current,
      demoReferral.link,
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
  }, [])

  const onCopyCode = async () => {
    await copyText(demoReferral.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1600)
  }

  const onCopyLink = async () => {
    await copyText(demoReferral.link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1600)
  }

  const onShare = async () => {
    haptic('medium')
    const shareData = {
      title: 'GAZE Platform',
      text: 'Привет! Я пользуюсь GAZE — платформой для мастеров бьюти-сферы. Попробуй по моей ссылке:',
      url: demoReferral.link,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } else {
        // Fallback: копируем ссылку
        await copyText(demoReferral.link)
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      /* пользователь отменил — тихо */
    }
  }

  const activeCount = demoReferral.history.filter((h) => h.status === 'active').length

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
        <h1 className={styles.heroTitle}>Дари месяц — получай месяц</h1>
        <p className={styles.heroText}>
          Пригласи коллегу-мастера в GAZE. Когда он оформит подписку — ты получишь{' '}
          <strong>{demoReferral.bonusPerInvite}</strong>. Бонус суммируется, до{' '}
          {demoReferral.maxBonus}.
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="cta">до {demoReferral.rate}%</Badge>
          <Badge variant="accent">{demoReferral.bonusPerInvite}</Badge>
        </div>
      </Card>

      {/* QR-код */}
      <Card className={styles.qrCard}>
        <canvas ref={canvasRef} className={styles.qrCanvas} />
        <span className={styles.qrHint}>Наведите камеру — откроется GAZE</span>
      </Card>

      {/* Реферальный код */}
      <div className={styles.codeRow}>
        <span className={styles.code}>{demoReferral.code}</span>
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

      {/* Статистика: приглашено / заработано / активных */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{demoReferral.invited}</span>
          <span className={styles.statLabel}>приглашено</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{activeCount}</span>
          <span className={styles.statLabel}>активных</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatMoney(demoReferral.earned)}</span>
          <span className={styles.statLabel}>заработано, ₽</span>
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
            <span className={styles.stepTitle}>Он оформит подписку</span>
            <span className={styles.stepText}>
              Друг регистрируется в GAZE по твоей ссылке и активирует тариф.
            </span>
          </div>
        </Card>
        <Card className={styles.stepCard}>
          <span className={styles.stepNum}>3</span>
          <div className={styles.stepBody}>
            <span className={styles.stepTitle}>Получаешь бонус</span>
            <span className={styles.stepText}>
              {demoReferral.bonusPerInvite} + {demoReferral.rate}% от его оплаты.
              Бонус суммируется, до {demoReferral.maxBonus}.
            </span>
          </div>
        </Card>
      </div>

      {/* История приглашений */}
      {demoReferral.history.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>История приглашений</h2>
          <Card className={styles.historyCard}>
            {demoReferral.history.map((invite, i) => (
              <div
                key={i}
                className={cx(styles.historyRow, i > 0 && styles.historyRowBorder)}
              >
                <span className={styles.historyAvatar}>
                  <Users size={14} strokeWidth={2} />
                </span>
                <div className={styles.historyInfo}>
                  <span className={styles.historyName}>{invite.name}</span>
                  <span className={styles.historyDate}>{invite.date}</span>
                </div>
                {invite.status === 'active' ? (
                  <Badge variant="success">
                    <Check size={10} strokeWidth={3} />
                    Активна
                  </Badge>
                ) : (
                  <Badge variant="accent">Ожидает</Badge>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Демо-подсказка */}
      <p className={styles.hint}>
        В демо-режиме бонусы начисляются автоматически. В реальной версии — после
        оплаты приглашённого мастера.
      </p>
    </div>
  )
}
