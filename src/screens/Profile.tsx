import { useRef, useState } from 'react'
import { Bell, Camera, ChevronRight, Copy, ExternalLink, Info, LogOut, MessageCircle, Tag, User, X } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input } from '../components/Input'
import { demoReferral, demoSubscription } from '../lib/dev-data'
import { getDisplayName, readProfileName, saveProfileName } from '../lib/name'
import {
  DEFAULT_SPECIALTY,
  readSpecialty,
  saveSpecialty,
  SPECIALTY_OPTIONS,
} from '../lib/specialty'
import { copyText, haptic, hapticSuccess } from '../lib/telegram'
import { cx, formatDateLong, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Profile.module.css'

/* ------------------------------------------------------------------ */
/* Локальные настройки в localStorage                                  */
/* ------------------------------------------------------------------ */

const NOTIF_KEY = 'gaze_notifications'

export interface NotificationSettings {
  /** Напоминания о записях */
  reminders: boolean
  /** Возврат клиентов (кого давно не было) */
  returns: boolean
  /** Дайджест дня */
  digest: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  reminders: true,
  returns: true,
  digest: false,
}

function readNotifications(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATIONS }
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>
    return {
      reminders: parsed.reminders ?? DEFAULT_NOTIFICATIONS.reminders,
      returns: parsed.returns ?? DEFAULT_NOTIFICATIONS.returns,
      digest: parsed.digest ?? DEFAULT_NOTIFICATIONS.digest,
    }
  } catch {
    return { ...DEFAULT_NOTIFICATIONS }
  }
}

function writeNotifications(next: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Карточка подписки: статус, дата окончания, тариф, прогресс-бар дней */
/* ------------------------------------------------------------------ */

function SubscriptionCard({ onManage }: { onManage: () => void }) {
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

      <Button variant="ghost" fullWidth size="md" onClick={onManage}>
        Управлять подпиской
      </Button>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Реферальная программа: код GAZE-XXXXX, статистика, копирование      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Пункт меню настроек: иконка + название + стрелка →                  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Модалка (bottom sheet) — премиум, светлая, «без крика»              */
/* ------------------------------------------------------------------ */

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <h3 className={styles.sheetTitle}>{title}</h3>
          <button className={styles.sheetClose} aria-label="Закрыть" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  )
}

/** Переключатель (toggle) в стиле премиум-приложения */
function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      className={styles.toggleRow}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptic('light')
        onChange(!checked)
      }}
    >
      <span className={styles.toggleTexts}>
        <span className={styles.toggleLabel}>{label}</span>
        {hint && <span className={styles.toggleHint}>{hint}</span>}
      </span>
      <span className={cx(styles.toggleTrack, checked && styles.toggleTrackOn)}>
        <span className={cx(styles.toggleKnob, checked && styles.toggleKnobOn)} />
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Экран «Профиль»                                                     */
/* ------------------------------------------------------------------ */

export default function Profile() {
  const isDemo = useMasterStore((s) => s.isDemo)
  const master = useMasterStore((s) => s.master)
  const navigate = useAppStore((s) => s.navigate)

  const fallbackName = getDisplayName(master)
  const [savedName, setSavedName] = useState(readProfileName)
  const name = savedName || fallbackName
  // T12 — ниша мастера: сохранённая (localStorage gaze_profile_specialty),
  // иначе ниша демо-мастера, иначе нейтральный фолбэк «Специалист».
  const [savedSpecialty, setSavedSpecialty] = useState<string[]>(() => readSpecialty())
  const specialty = savedSpecialty.length > 0 ? savedSpecialty : master?.specialty ?? DEFAULT_SPECIALTY

  // Модалка «Изменить имя и фото»
  const [editOpen, setEditOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Модалка «Твоя ниша» (T12)
  const [specialtyOpen, setSpecialtyOpen] = useState(false)
  const [nicheDraft, setNicheDraft] = useState<string>(() => specialty[0] ?? '')

  // Модалка «Уведомления»
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationSettings>(readNotifications)

  // T13 — Модалка «Подписка»: тариф, срок, продление/отмена (демо-тосты)
  const [subOpen, setSubOpen] = useState(false)

  // Тосты (демо-режим и не только)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const openEdit = () => {
    haptic('light')
    setNameDraft(name)
    setEditOpen(true)
  }

  const openNotifications = () => {
    haptic('light')
    setNotifOpen(true)
  }

  const openSub = () => {
    haptic('light')
    setSubOpen(true)
  }

  /** T13 — Продление (демо): закрываем модалку и показываем тост */
  const extendSub = () => {
    hapticSuccess()
    setSubOpen(false)
    showToast('Подписка продлена на 30 дней ✓')
  }

  /** T13 — Отмена (демо): оплата недоступна, только уведомление */
  const cancelSub = () => {
    haptic('medium')
    setSubOpen(false)
    showToast('В демо-режиме недоступно')
  }

  const openSpecialty = () => {
    haptic('light')
    setNicheDraft(specialty[0] ?? '')
    setSpecialtyOpen(true)
  }

  const saveNiche = () => {
    const next = nicheDraft.trim()
    if (!next) return
    hapticSuccess()
    saveSpecialty([next])
    setSavedSpecialty([next])
    setSpecialtyOpen(false)
    showToast('Ниша сохранена ✓')
  }

  const saveName = () => {
    const next = nameDraft.trim()
    if (!next) return
    hapticSuccess()
    saveProfileName(next)
    setSavedName(next)
    setEditOpen(false)
    showToast('Имя сохранено ✓')
  }

  const onPhotoPicked = () => {
    // В демо-режиме фото не загружаем на сервер — просто показываем результат
    if (photoInputRef.current) photoInputRef.current.value = ''
    hapticSuccess()
    showToast('Фото обновлено ✓')
  }

  const setNotification = (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...notifications, [key]: value }
    setNotifications(next)
    writeNotifications(next)
  }

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
      <SubscriptionCard onManage={openSub} />

      {/* Реферальная программа */}
      <ReferralCard />

      {/* Настройки */}
      <Card className={styles.settingsCard}>
        <SettingsRow
          icon={<User size={16} strokeWidth={1.75} />}
          label="Изменить имя и фото"
          onClick={openEdit}
        />
        <SettingsRow
          icon={<Bell size={16} strokeWidth={1.75} />}
          label="Уведомления"
          onClick={openNotifications}
        />
        <SettingsRow
          icon={<Tag size={16} strokeWidth={1.75} />}
          label="Твоя ниша"
          onClick={openSpecialty}
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

      {/* Модалка: имя и фото */}
      {editOpen && (
        <Sheet title="Имя и фото" onClose={() => setEditOpen(false)}>
          <div className={styles.editAvatarRow}>
            <div className={styles.avatarWrap}>
              <Avatar name={nameDraft.trim() || name} size="lg" />
            </div>
            <Button variant="ghost" size="md" onClick={() => photoInputRef.current?.click()}>
              <Camera size={15} strokeWidth={1.75} />
              Сменить фото
            </Button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={onPhotoPicked}
              tabIndex={-1}
            />
          </div>

          <Input
            label="Имя"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Как тебя зовут?"
            maxLength={40}
            autoFocus
          />

          <Button size="lg" fullWidth disabled={!nameDraft.trim()} onClick={saveName}>
            Сохранить
          </Button>
          <p className={styles.hint}>Имя отображается в профиле. Фото — в демо-режиме.</p>
        </Sheet>
      )}

      {/* Модалка: уведомления */}
      {notifOpen && (
        <Sheet title="Уведомления" onClose={() => setNotifOpen(false)}>
          <p className={styles.notifIntro}>
            Что напоминать тебе в Telegram. Настройки сохраняются автоматически.
          </p>
          <Card className={styles.toggleCard}>
            <Toggle
              label="Напоминания о записях"
              hint="За день до визита клиентки"
              checked={notifications.reminders}
              onChange={(v) => setNotification('reminders', v)}
            />
            <Toggle
              label="Возврат клиентов"
              hint="Кого давно не было — подсказки"
              checked={notifications.returns}
              onChange={(v) => setNotification('returns', v)}
            />
            <Toggle
              label="Дайджест дня"
              hint="Итоги в конце дня"
              checked={notifications.digest}
              onChange={(v) => setNotification('digest', v)}
            />
          </Card>
        </Sheet>
      )}

      {/* Модалка: твоя ниша (T12) */}
      {specialtyOpen && (
        <Sheet title="Твоя ниша" onClose={() => setSpecialtyOpen(false)}>
          <p className={styles.notifIntro}>
            Выбери своё направление — подсказки услуг и тексты подстроятся под твою нишу.
            Подходит любой специалист: маникюр, массаж, косметология, брови/ресницы,
            парикмахер и другое.
          </p>
          <div className={styles.nicheChips}>
            {SPECIALTY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={cx(styles.nicheChip, nicheDraft === option && styles.nicheChipActive)}
                onClick={() => {
                  haptic('light')
                  setNicheDraft(option)
                }}
              >
                {option}
              </button>
            ))}
          </div>
          <Input
            label="Или укажи свою нишу"
            value={nicheDraft}
            onChange={(e) => setNicheDraft(e.target.value)}
            placeholder="Например, шугаринг или перманент"
            maxLength={40}
          />
          <Button size="lg" fullWidth disabled={!nicheDraft.trim()} onClick={saveNiche}>
            Сохранить
          </Button>
        </Sheet>
      )}

      {/* T13 — Модалка «Подписка»: тариф, срок, продление/отмена (демо) */}
      {subOpen && (
        <Sheet title="Подписка" onClose={() => setSubOpen(false)}>
          <div className={styles.subSheetCard}>
            <div className={styles.subSheetHead}>
              <span className={styles.subSheetPlan}>Тариф GAZE Platform</span>
              <Badge variant="success">Активна</Badge>
            </div>
            <div className={styles.subSheetPrice}>
              {demoSubscription.price}
              <span className={styles.subSheetPer}> ₽/мес</span>
            </div>
            <div className={styles.subSheetRows}>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Действует до</span>
                <span className={styles.subSheetValue}>{formatDateLong(demoSubscription.endDate)}</span>
              </div>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Осталось дней</span>
                <span className={styles.subSheetValue}>
                  {demoSubscription.daysLeft} из {demoSubscription.daysTotal}
                </span>
              </div>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Списание</span>
                <span className={styles.subSheetValue}>ежемесячно</span>
              </div>
            </div>
          </div>
          <Button size="lg" fullWidth onClick={extendSub}>
            Продлить подписку
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={cancelSub}>
            Отменить подписку
          </Button>
          <p className={styles.hint}>
            В демо-режиме оплата не выполняется — показываем только уведомления.
          </p>
        </Sheet>
      )}

      {/* Тост */}
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
