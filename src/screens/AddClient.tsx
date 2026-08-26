import { useState } from 'react'
import { ArrowLeft, Check, Repeat } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input, Textarea } from '../components/Input'
import { useAsync } from '../hooks/useAsync'
import { addClient, fetchClients, friendlyError } from '../lib/api'
import { markOnboardingStep } from '../lib/onboarding'
import { haptic, hapticSuccess } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './AddClient.module.css'

/** Нормализация телефона: только цифры (для поиска без дублей) */
function normalizePhone(p: string): string {
  return p.replace(/\D/g, '')
}

export default function AddClient() {
  const goBack = useAppStore((s) => s.goBack)
  const navigate = useAppStore((s) => s.navigate)
  const openAddProcedure = useAppStore((s) => s.openAddProcedure)

  const master = useMasterStore((s) => s.master)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  // T15 — Ссылка (Telegram/соцсеть) и краткое описание — необязательные поля
  const [link, setLink] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const masterId = master?.id ?? null

  // Существующие клиенты — чтобы не создавать дубль при повторном визите
  const clientsState = useAsync(
    () => (masterId ? fetchClients(masterId) : Promise.resolve([])),
    [masterId],
  )
  const clients = clientsState.data ?? []

  // T15 — повторный визит: клиент уже есть, если совпало имя ИЛИ телефон
  const trimmedName = name.trim().toLowerCase()
  const normalizedPhone = normalizePhone(phone)
  const duplicate =
    trimmedName || normalizedPhone
      ? (clients.find(
          (c) =>
            (normalizedPhone.length > 0 && normalizePhone(c.phone) === normalizedPhone) ||
            (trimmedName.length > 0 && c.name.trim().toLowerCase() === trimmedName),
        ) ?? null)
      : null

  const canSubmit = Boolean(name.trim() && masterId && !submitting && !saved && !duplicate)

  const onSubmit = async () => {
    if (!canSubmit || !master) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      // В демо-режиме (этап 3 без auth) addClient не падает: возвращает успех.
      // Ссылка и описание — необязательные, пустые не отправляем.
      await addClient({
        master_id: master.id,
        name: name.trim(),
        phone: phone.trim(),
        link: link.trim() || undefined,
        description: description.trim() || undefined,
      })
      // T3 — шаг квеста «Добавь первого клиента» выполнен
      markOnboardingStep('client')
      hapticSuccess()
      setSaved(true)
      // Даём увидеть «Клиент добавлен ✓», потом возвращаемся на список клиентов
      setTimeout(() => navigate('clients'), 600)
    } catch (err) {
      setSubmitError(friendlyError(err))
      haptic('medium')
    } finally {
      setSubmitting(false)
    }
  }

  /** T15 — вместо создания дубля переходим к записи визита существующему клиенту */
  const recordVisit = () => {
    if (!duplicate) return
    haptic('light')
    openAddProcedure(duplicate.id)
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
        <h1 className={styles.headerTitle}>Добавить клиента</h1>
      </header>

      <div className={styles.form}>
        {/* Имя — обязательно */}
        <Input
          label="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting || saved}
          placeholder="Например, Мария"
          autoFocus
        />

        {/* Телефон */}
        <Input
          label="Телефон"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting || saved}
          placeholder="+7 900 000-00-00"
        />

        {/* T15 — Ссылка (Telegram/соцсеть), необязательно */}
        <Input
          label="Ссылка (Telegram/соцсеть)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={submitting || saved}
          placeholder="@username или https://t.me/..."
          autoCapitalize="none"
          autoCorrect="off"
        />

        {/* T15 — Краткое описание, необязательно */}
        <Textarea
          label="Краткое описание (необязательно)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting || saved}
          placeholder="Любит синий, чувствительная кожа…"
        />

        {/* T15 — Повторный визит: клиент уже есть — не создаём дубль */}
        {duplicate && !saved && (
          <Card className={styles.duplicateBox}>
            <div className={styles.duplicateHead}>
              <Repeat size={16} strokeWidth={2} className={styles.duplicateIcon} />
              <p className={styles.duplicateTitle}>Клиент уже есть в базе</p>
            </div>
            <p className={styles.duplicateText}>
              <strong>{duplicate.name}</strong> · {duplicate.phone}
            </p>
            {duplicate.description && <p className={styles.duplicateText2}>{duplicate.description}</p>}
            <p className={styles.duplicateHint}>Не создавай дубль — запиши визит существующему клиенту.</p>
            <Button size="lg" fullWidth onClick={recordVisit} className={styles.visitBtn}>
              Записать визит
            </Button>
            <p className={styles.duplicateMeta}>
              Это другой человек? Измени имя или телефон — и тогда можно добавить нового клиента.
            </p>
          </Card>
        )}

        {/* Успех сохранения */}
        {saved && (
          <Card className={styles.successBox}>
            <p className={styles.successText}>Клиент добавлен ✓</p>
          </Card>
        )}

        {/* Ошибка сохранения */}
        {submitError && (
          <Card className={styles.errorBox}>
            <p className={styles.errorText}>{submitError}</p>
          </Card>
        )}

        <Button
          size="lg"
          fullWidth
          disabled={!canSubmit}
          onClick={onSubmit}
          className={saved ? styles.savedBtn : undefined}
        >
          {saved ? (
            <>
              <Check size={18} strokeWidth={2} /> Сохранено
            </>
          ) : submitting ? (
            'Сохраняем…'
          ) : (
            'Сохранить'
          )}
        </Button>

        <p className={styles.hint}>
          Имя — обязательно. Телефон и ссылка помогают находить клиента и не создавать дубли при повторном визите.
        </p>
      </div>
    </div>
  )
}
