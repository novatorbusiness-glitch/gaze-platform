import { useState } from 'react'
import { Bell, ChevronRight, Copy, ExternalLink, Info, LogOut, MessageCircle, User } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { demoReferral, demoSubscription } from '../lib/dev-data'
import { copyText, haptic } from '../lib/telegram'
import { cx, formatDateLong, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Profile.module.css'

/** Карточка подписки: статус, дата окончания, тариф, прогресс-бар дней */
function SubscriptionCard() {
  const progress = Math.round((demoSubscription.daysLeft / demoSubscription.daysTotal) * 100)

  return (
    <Card className={styles.subCard}>
      <div className={styles.subHead}>
        <span className={styles.subStatus}>
          <span className={styles.subDot} />
          Активна
        </span>
        <Badge variant="success">до {formatDateLong(demoSubscription.endDate)}</Badge>
      </div>

      <div className={styles.subBody}>
        <div>
          <span className={styles.subTariff}>
            <span className={styles.subPrice}>{demoSubscription.price}</span> ₽/мес
          </span>
        </div>
        <span className={styles.subLabel}>Тариф GAZE Platform</span>
      </div>

      {/* Прогресс-бар дней (демо: осталось 23 из 30) */}
      <div className={styles.subProgress}>
        <div className={styles.subProgressTrack}>
          <div className={styles.subProgressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.subProgressText}>
          осталось {demoSubscription.daysLeft} из {demoSubscription.daysTotal} дней
        </span>
      </div>

      <Button variant="ghost" fullWidth size="md">
        Управлять подпиской
      </Button>
    </Card>
  )
}

/** Реферальная программа: код GAZE-XXXXX, статистика, кнопка копирования ссылки */
function ReferralCard() {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

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

  return (
    <Card className={styles.refCard}>
      <div className={styles.refHead}>
        <span className={styles.refTitle}>Реферальная программа</span>
        <Badge variant="cta">До {demoReferral.rate}%</Badge>
      </div>

      {/* Код — JetBrains Mono, крупно, с кнопкой копирования */}
      <div className={styles.refCodeRow}>
        <span className={styles.refCode}>{demoReferral.code}</span>
        <button className={styles.refCopyBtn} aria-label="Скопировать код" onClick={onCopyCode}>
          <Copy size={15} strokeWidth={1.75} />
          {copiedCode ? 'Готово' : ''}
        </button>
      </div>

      {/* Статистика: приглашено / заработано / ставка */}
      <div className={styles.refStats}>
        <div className={styles.refStat}>
          <span className={styles.refStatValue}>{demoReferral.invited}</span>
          <span className={styles.refStatLabel}>мастеров приглашено</span>
        </div>
        <div className={styles.refDivider} />
        <div className={styles.refStat}>
          <span className={styles.refStatValue}>{formatMoney(demoReferral.earned)}</span>
          <span className={styles.refStatLabel}>заработано</span>
        </div>
        <div className={styles.refDivider} />
        <div className={styles.refStat}>
          <span className={styles.refStatValue}>до {demoReferral.rate}%</span>
          <span className={styles.refStatLabel}>с каждой оплаты</span>
        </div>
      </div>

      <Button fullWidth size="md" onClick={onCopyLink}>
        <ExternalLink size={15} strokeWidth={2} />
        {copiedLink ? 'Ссылка скопирована ✓' : 'Скопировать ссылку'}
      </Button>
      <span className={styles.refLink}>{demoReferral.link}</span>
    </Card>
  )
}

/** Пункт меню настроек: иконка + название + стрелка → */
function SettingsRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button className={styles.settingsRow} onClick={onClick}>
      <span className={styles.settingsIcon}>{icon}</span>
      <span className={styles.settingsLabel}>{label}</span>
      <ChevronRight size={16} strokeWidth={1.75} className={styles.settingsChevron} />
    </button>
  )
}

export default function Profile() {
  const isDemo = useMasterStore((s) => s.isDemo)
  const master = useMasterStore((s) => s.master)
  const navigate = useAppStore((s) => s.navigate)

  const name = master?.name ?? 'Анна Казак'
  const specialty = master?.specialty ?? ['Брови', 'Ресницы']

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Профиль</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>

      {/* Аватар + имя + специализации */}
      <div className={styles.identity}>
        <div className={styles.avatarWrap}>
          <Avatar name={name} size="xl" />
        </div>
        <h2 className={styles.name}>{name}</h2>
        <div className={styles.specialties}>
          {specialty.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
          <Badge variant="accent">GAZE. ARCH выпускница</Badge>
        </div>
      </div>

      {/* Подписка */}
      <SubscriptionCard />

      {/* Реферальная программа */}
      <ReferralCard />

      {/* Настройки */}
      <Card className={styles.settingsCard}>
        <SettingsRow
          icon={<User size={16} strokeWidth={1.75} />}
          label="Изменить имя и фото"
          onClick={() => haptic('light')}
        />
        <SettingsRow
          icon={<Bell size={16} strokeWidth={1.75} />}
          label="Уведомления"
          onClick={() => haptic('light')}
        />
        <SettingsRow
          icon={<MessageCircle size={16} strokeWidth={1.75} />}
          label="Связаться с поддержкой"
          onClick={() => {
            haptic('light')
            navigate('chat')
          }}
        />
        <SettingsRow
          icon={<Info size={16} strokeWidth={1.75} />}
          label="О платформе"
          onClick={() => haptic('light')}
        />
      </Card>

      {/* Выйти — приглушённый, чтобы не нажать случайно */}
      <button
        className={cx(styles.logout, 'pressable')}
        onClick={() => haptic('medium')}
      >
        <LogOut size={15} strokeWidth={1.75} />
        Выйти
      </button>
    </div>
  )
}
