import { useRef, useState } from 'react'
import { Bell, Building2, Camera, ChevronRight, Copy, Crown, ExternalLink, Gift, Images, Info, LogOut, MessageCircle, Sparkles, Tag, User, X } from 'lucide-react'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input } from '../components/Input'
import { demoReferral } from '../lib/dev-data'
import { getDisplayName, readProfileName, saveProfileName } from '../lib/name'
import {
  DEFAULT_SPECIALTY,
  readSpecialty,
  saveSpecialty,
  SPECIALTY_OPTIONS,
} from '../lib/specialty'
import { copyText, haptic, hapticSuccess, openSubscriptionPayment } from '../lib/telegram'
import { cx, formatDateLong, formatMoney } from '../lib/utils'
import { getSalonSettings, setSalonSettings, type SalonSettings } from '../lib/salon'
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
/* Карточка подписки: статус, дата окончания, тариф, остаток дней      */
/* ------------------------------------------------------------------ */

/**
 * Сколько дней осталось до конца подписки (округление вверх, 0 если нет/просрочена).
 * Всего «из N» не показываем: период у мастеров разный (30/365 дней),
 * а даты начала подписки в сторе нет — хардкод «из 30» давал «365 из 30 дней».
 */
function subscriptionDaysLeft(end: string): number {
  if (!end) return 0
  return Math.max(0, Math.ceil((new Date(end + 'T00:00:00').getTime() - Date.now()) / 86400000))
}

/** Русская плюрализация: 1 день / 2 дня / 5 дней */
function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'дней'
  if (last > 1 && last < 5) return 'дня'
  if (last === 1) return 'день'
  return 'дней'
}

function SubscriptionCard({ onManage }: { onManage: () => void }) {
  const plan = useAppStore((s) => s.plan)
  const subscriptionEnd = useAppStore((s) => s.subscriptionEnd)
  const navigate = useAppStore((s) => s.navigate)
  const isPremium = plan === 'premium'
  const daysLeft = subscriptionEnd ? subscriptionDaysLeft(subscriptionEnd) : 0

  return (
    <Card className={styles.subCard}>
      <div className={styles.subHead}>
        <span className={styles.subStatus}>
          <span className={styles.subDot} />
          {isPremium ? 'Активна' : 'Не активна'}
        </span>
        {isPremium && subscriptionEnd ? (
          <Badge variant="success">до {formatDateLong(subscriptionEnd)}</Badge>
        ) : (
          <Badge variant="accent">1 500 ₽/мес</Badge>
        )}
      </div>

      <div className={styles.subBody}>
        <div>
          <span className={styles.subTariff}>
            <span className={styles.subPrice}>1 500</span> ₽/мес
          </span>
        </div>
        <span className={styles.subLabel}>
          Премиум «AI-маркетолог» · {isPremium ? 'полный доступ' : 'все функции платформы'}
        </span>
      </div>

      {/* Сколько дней осталось до конца подписки (без «из N»: период разный — 30/365 дней) */}
      <div className={styles.subProgress}>
        <span className={styles.subProgressText}>
          {isPremium ? `осталось ${daysLeft} ${pluralDays(daysLeft)}` : 'подписка не оплачена'}
        </span>
      </div>

      {/* G2 — Премиум-функции: вход в AI-маркетолог / переход на подписку */}
      {isPremium ? (
        <Button variant="ghost" fullWidth size="md" onClick={() => navigate('aiMarketer')}>
          <Sparkles size={15} strokeWidth={2} />
          AI-маркетолог ✨
        </Button>
      ) : (
        <Button fullWidth size="md" onClick={() => navigate('premium')}>
          <Crown size={15} strokeWidth={2} />
          Оплатить премиум — 1 500 ₽/мес
        </Button>
      )}

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
  const navigate = useAppStore((s) => s.navigate)
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
      {/* T6 — полный экран приглашения: QR-код, шаринг, шаги и история */}
      <Button
        variant="ghost"
        fullWidth
        size="md"
        onClick={() => {
          haptic('medium')
          navigate('invite')
        }}
      >
        <Gift size={15} strokeWidth={2} />
        QR-код, шаги и история
      </Button>
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
  // G2 — тариф: премиум-бейдж, цена подписки, вход в AI-маркетолог
  const plan = useAppStore((s) => s.plan)
  const subscriptionEnd = useAppStore((s) => s.subscriptionEnd)
  const isPremium = plan === 'premium'
  const subDaysLeft = isPremium && subscriptionEnd ? subscriptionDaysLeft(subscriptionEnd) : 0

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

  // T19 — Модалка «Салон»
  const [salonOpen, setSalonOpen] = useState(false)
  const [salonDraft, setSalonDraft] = useState<SalonSettings>(getSalonSettings)

  const openSalon = () => {
    setSalonDraft(getSalonSettings())
    setSalonOpen(true)
  }
  const saveSalon = () => {
    setSalonSettings(salonDraft)
    hapticSuccess()
    setSalonOpen(false)
  }

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

  /** T13 — Продление: открываем оплату в боте (Telegram Stars, 1 500 ₽/мес) */
  const extendSub = () => {
    hapticSuccess()
    setSubOpen(false)
    openSubscriptionPayment()
    showToast('Открываем оплату в боте…')
  }

  /** T13 — Отмена: подписка продлевается автоматически каждый месяц */
  const cancelSub = () => {
    haptic('medium')
    setSubOpen(false)
    showToast('Отмена — через /stop в боте GAZE')
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
          {isPremium && (
            <Badge variant="cta">
              <Crown size={11} strokeWidth={2.5} />
              PREMIUM
            </Badge>
          )}
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
          icon={<Building2 size={16} strokeWidth={1.75} />}
          label={getSalonSettings().enabled ? `Салон · ${getSalonSettings().percent}%` : 'Работаю в салоне'}
          onClick={openSalon}
        />
        <SettingsRow
          icon={<Gift size={16} strokeWidth={1.75} />}
          label="Бонусы и скидки"
          onClick={() => navigate('bonuses')}
        />
        <SettingsRow
          icon={<Sparkles size={16} strokeWidth={1.75} />}
          label="AI-маркетолог ✨"
          onClick={() => navigate('aiMarketer')}
        />
        <SettingsRow
          icon={<Images size={16} strokeWidth={1.75} />}
          label="Генератор обложек"
          onClick={() => navigate('coverMaker')}
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

      {/* T19 — Модалка «Салон»: % от чека, скрытие контактов */}
      {salonOpen && (
        <Sheet title="Работа в салоне" onClose={() => setSalonOpen(false)}>
          <p className={styles.notifIntro}>
            Если ты работаешь в салоне и получаешь процент от чека — включи режим.
            GAZE будет считать твой доход и прибыль с учётом процента и только твоих расходов.
          </p>
          <label className={styles.switchRow}>
            <span>Работаю в салоне</span>
            <input
              type="checkbox"
              checked={salonDraft.enabled}
              onChange={(e) => setSalonDraft({ ...salonDraft, enabled: e.target.checked })}
            />
          </label>
          {salonDraft.enabled && (
            <>
              <Input
                label="Мой процент от чека, %"
                type="number"
                min={1}
                max={100}
                value={String(salonDraft.percent)}
                onChange={(e) =>
                  setSalonDraft({
                    ...salonDraft,
                    percent: Math.max(1, Math.min(100, Number(e.target.value) || 60)),
                  })
                }
              />
              <label className={styles.switchRow}>
                <span>Салон скрывает контакты клиентов</span>
                <input
                  type="checkbox"
                  checked={salonDraft.hideContacts}
                  onChange={(e) => setSalonDraft({ ...salonDraft, hideContacts: e.target.checked })}
                />
              </label>
              <p className={styles.notifIntro}>
                Пример: чек 2 500 ₽ при {salonDraft.percent}% — твой доход{' '}
                {Math.round((2500 * salonDraft.percent) / 100)} ₽.
              </p>
            </>
          )}
          <Button size="lg" fullWidth onClick={saveSalon}>
            Сохранить
          </Button>
        </Sheet>
      )}

      {/* T13 — Модалка «Подписка»: статус, срок, оплата/обновление */}
      {subOpen && (
        <Sheet title="Премиум «AI-маркетолог»" onClose={() => setSubOpen(false)}>
          <div className={styles.subSheetCard}>
            <div className={styles.subSheetHead}>
              <span className={styles.subSheetPlan}>
                Премиум «AI-маркетолог» · {isPremium ? 'полный доступ' : 'не активен'}
              </span>
              {isPremium ? (
                <Badge variant="success">Активен</Badge>
              ) : (
                <Badge variant="accent">1 500 ₽/мес</Badge>
              )}
            </div>
            <div className={styles.subSheetPrice}>
              1 500
              <span className={styles.subSheetPer}> ₽/мес</span>
            </div>
            <div className={styles.subSheetRows}>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Действует до</span>
                <span className={styles.subSheetValue}>
                  {isPremium && subscriptionEnd ? formatDateLong(subscriptionEnd) : '— (нет подписки)'}
                </span>
              </div>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Осталось дней</span>
                <span className={styles.subSheetValue}>
                  {isPremium && subscriptionEnd
                    ? `${subDaysLeft} ${pluralDays(subDaysLeft)}`
                    : '—'}
                </span>
              </div>
              <div className={styles.subSheetRow}>
                <span className={styles.subSheetLabel}>Списание</span>
                <span className={styles.subSheetValue}>ежемесячно</span>
              </div>
            </div>
          </div>
          {isPremium ? (
            <Button size="lg" fullWidth onClick={() => navigate('aiMarketer')}>
              <Sparkles size={16} strokeWidth={2} />
              Открыть AI-маркетолог ✨
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={() => navigate('premium')}>
              <Crown size={16} strokeWidth={2} />
              Оплатить 1 500 ₽/мес
            </Button>
          )}
          <Button variant="ghost" size="md" fullWidth onClick={extendSub}>
            Продлить подписку
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={cancelSub}>
            Отменить подписку
          </Button>
          <p className={styles.hint}>
            Оплата через Telegram Stars в боте GAZE. Подписка продлевается автоматически каждый месяц.
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
