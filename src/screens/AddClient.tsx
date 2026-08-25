import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input } from '../components/Input'
import { addClient, friendlyError } from '../lib/api'
import { haptic, hapticSuccess } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './AddClient.module.css'

export default function AddClient() {
  const goBack = useAppStore((s) => s.goBack)
  const navigate = useAppStore((s) => s.navigate)

  const master = useMasterStore((s) => s.master)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const canSubmit = Boolean(name.trim() && master?.id && !submitting && !saved)

  const onSubmit = async () => {
    if (!canSubmit || !master) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      // В демо-режиме (этап 3 без auth) addClient не падает: возвращает успех
      await addClient({ master_id: master.id, name: name.trim(), phone: phone.trim() })
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

        <p className={styles.hint}>Имя — обязательно. Телефон поможет находить клиента по номеру.</p>
      </div>
    </div>
  )
}
