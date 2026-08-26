import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import ErrorState from '../components/ErrorState'
import { Input, Textarea } from '../components/Input'
import SkeletonLoader from '../components/SkeletonLoader'
import { useAsync } from '../hooks/useAsync'
import { addProcedure, fetchClients, friendlyError, type NewProcedureInput } from '../lib/api'
import { markOnboardingStep } from '../lib/onboarding'
import { haptic, hapticSuccess } from '../lib/telegram'
import { formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './AddProcedure.module.css'

const SERVICE_SUGGESTIONS = [
  'Архитектура бровей',
  'Ламинирование бровей',
  'Ламинирование ресниц',
  'Наращивание',
  'Окрашивание',
  'Комплекс GAZE',
  'Коррекция',
]

export default function AddProcedure() {
  const goBack = useAppStore((s) => s.goBack)
  const selectedClientId = useAppStore((s) => s.selectedClientId)

  const master = useMasterStore((s) => s.master)
  const masterStatus = useMasterStore((s) => s.status)
  const masterError = useMasterStore((s) => s.error)

  const masterId = master?.id ?? null

  const [clientId, setClientId] = useState(selectedClientId ?? '')
  const [serviceType, setServiceType] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const clientsState = useAsync(
    () => (masterId ? fetchClients(masterId) : Promise.resolve([])),
    [masterId],
  )

  const clients = clientsState.data ?? []
  const client = clients.find((c) => c.id === clientId) ?? null

  const loading = masterStatus === 'loading' || (masterStatus === 'ready' && clientsState.status === 'loading')
  const error = masterStatus === 'error' ? masterError : clientsState.status === 'error' ? clientsState.error : null

  const priceValue = Number(price)
  const canSubmit = Boolean(
    clientId && serviceType.trim() && priceValue > 0 && masterId && !submitting && !saved,
  )

  const onSubmit = async () => {
    if (!canSubmit || !masterId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const input: NewProcedureInput = {
        client_id: clientId,
        master_id: masterId,
        service_type: serviceType.trim(),
        price: priceValue,
        notes: notes.trim() || undefined,
      }
      await addProcedure(input)
      // T3 — шаг квеста «Запиши первую процедуру» выполнен
      markOnboardingStep('procedure')
      hapticSuccess()
      setSaved(true)
      // Даём увидеть «Сохранено ✓», потом возвращаемся на профиль клиента
      setTimeout(() => goBack(), 400)
    } catch (err) {
      setSubmitError(friendlyError(err))
      haptic('medium')
    } finally {
      setSubmitting(false)
    }
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
        <h1 className={styles.headerTitle}>Записать процедуру</h1>
      </header>

      {loading ? (
        <div className={styles.form}>
          <SkeletonLoader shape="card" height={56} />
          <SkeletonLoader shape="card" height={56} />
          <SkeletonLoader shape="card" height={56} />
          <SkeletonLoader shape="card" height={90} />
          <SkeletonLoader shape="button" height={52} />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className={styles.form}>
          {/* Клиент */}
          <label className={styles.field}>
            <span className={styles.label}>Клиент</span>
            <select
              className={styles.select}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={Boolean(selectedClientId) || submitting}
            >
              {!clientId && <option value="">Выбери клиента…</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </label>

          {client && (
            <p className={styles.clientHint}>
              Записываем визит для <strong>{client.name}</strong>
            </p>
          )}

          {/* Услуга */}
          <Input
            label="Услуга"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            list="gaze-services"
            disabled={submitting}
            placeholder="Например, архитектура бровей"
          />
          <datalist id="gaze-services">
            {SERVICE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          {/* Цена */}
          <Input
            label="Цена, ₽"
            mono
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={submitting}
            placeholder="2500"
          />

          {/* Заметка */}
          <Textarea
            label="Заметка (необязательно)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            placeholder="Изгиб, цвет, реакция кожи…"
          />

          {/* Ошибка сохранения (в т.ч. RLS без auth — этап 3) */}
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
              `Сохранить · ${priceValue > 0 ? formatMoney(priceValue) : ''}`
            )}
          </Button>

          <p className={styles.hint}>
            После сохранения обновятся: история визитов, доход за месяц и средний чек.
          </p>
        </div>
      )}
    </div>
  )
}
