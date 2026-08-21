import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  demoActiveBonuses,
  demoBonusRecommendations,
  demoBonusStats,
  demoClients,
  type ActiveBonus,
  type BonusKind,
  type BonusRecommendation,
} from '../lib/dev-data'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Bonuses.module.css'

const KIND_LABEL: Record<BonusKind, string> = {
  discount: 'СКИДКА',
  cashback: 'КЕШБЭК',
  gift: 'ПОДАРОК',
}

const KIND_VARIANT: Record<BonusKind, 'cta' | 'success' | 'warning'> = {
  discount: 'cta',
  cashback: 'success',
  gift: 'warning',
}

interface NewBonusForm {
  clientName: string
  kind: BonusKind
  value: string
  expiresAt: string
}

/** Карточка рекомендации 💡 — сворачивается с checkmark после «Применить» */
function RecommendationCard({
  rec,
  applied,
  onApply,
}: {
  rec: BonusRecommendation
  applied: boolean
  onApply: () => void
}) {
  return (
    <Card className={cx(styles.recCard, applied && styles.recApplied)}>
      <div className={styles.recHead}>
        <span className={styles.recIcon}>💡</span>
        <div className={styles.recBody}>
          <span className={styles.recName}>{rec.clientName}</span>
          <span className={styles.recReason}>
            {rec.reason} → {rec.action}
          </span>
        </div>
      </div>
      {applied ? (
        <div className={styles.recDone}>
          <Check size={16} strokeWidth={2.5} />
          Применено
        </div>
      ) : (
        <Button size="md" fullWidth onClick={onApply}>
          Применить
        </Button>
      )}
    </Card>
  )
}

/** Строка активного бонуса: pill-badge типа + клиент + значение + срок */
function ActiveBonusRow({ bonus }: { bonus: ActiveBonus }) {
  return (
    <Card className={styles.activeRow}>
      <Badge variant={KIND_VARIANT[bonus.kind]}>{KIND_LABEL[bonus.kind]}</Badge>
      <div className={styles.activeInfo}>
        <span className={styles.activeName}>{bonus.clientName}</span>
        <span className={styles.activeMeta}>
          {bonus.value} · {bonus.expiresAt}
        </span>
      </div>
    </Card>
  )
}

export default function Bonuses() {
  const isDemo = useMasterStore((s) => s.isDemo)

  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [activeBonuses, setActiveBonuses] = useState<ActiveBonus[]>(demoActiveBonuses)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewBonusForm>({
    clientName: demoClients[0]?.name ?? '',
    kind: 'discount',
    value: '10%',
    expiresAt: 'до конца месяца',
  })

  const apply = (id: string) => {
    hapticSuccess()
    setAppliedIds((prev) => new Set(prev).add(id))
    // Карточка сворачивается (CSS-анимация) — оставляем в DOM с checkmark
  }

  const createBonus = () => {
    hapticSuccess()
    const bonus: ActiveBonus = {
      id: `manual-${Date.now()}`,
      clientName: form.clientName,
      kind: form.kind,
      value: form.value,
      expiresAt: form.expiresAt,
    }
    setActiveBonuses((prev) => [bonus, ...prev])
    setShowModal(false)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Бонусы и скидки</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>

      {/* Подсказка: платформа анализирует историю визитов */}
      <Card className={styles.hintCard}>
        <span className={styles.hintText}>
          Платформа анализирует историю визитов и подсказывает, кому сейчас стоит
          предложить бонус.
        </span>
      </Card>

      {/* Мини-статистика бонусов */}
      <Card className={styles.statsCard}>
        <span className={styles.statsNum}>{demoBonusStats.returnedClients}</span>
        <span className={styles.statsText}>клиентов вернули бонусы в этом месяце</span>
      </Card>

      {/* Рекомендации */}
      <h2 className={styles.sectionTitle}>Рекомендации</h2>
      <div className={styles.recList}>
        {demoBonusRecommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            rec={rec}
            applied={appliedIds.has(rec.id)}
            onApply={() => apply(rec.id)}
          />
        ))}
      </div>

      {/* Активные бонусы */}
      <h2 className={styles.sectionTitle}>Активные бонусы</h2>
      <div className={styles.activeList}>
        {activeBonuses.length > 0 ? (
          activeBonuses.map((bonus) => <ActiveBonusRow key={bonus.id} bonus={bonus} />)
        ) : (
          <Card className={styles.emptyCard}>
            <p className={styles.emptyText}>Пока нет активных бонусов.</p>
          </Card>
        )}
      </div>

      {/* Создание вручную */}
      <Button
        fullWidth
        size="lg"
        variant="ghost"
        onClick={() => {
          haptic('light')
          setShowModal(true)
        }}
      >
        <Plus size={18} strokeWidth={2} />
        Создать бонус вручную
      </Button>

      {/* Bottom-sheet: форма создания бонуса */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHead}>
              <h3 className={styles.sheetTitle}>Новый бонус</h3>
              <button className={styles.sheetClose} aria-label="Закрыть" onClick={() => setShowModal(false)}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Клиент</span>
              <select
                className={styles.select}
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              >
                {demoClients.slice(0, 20).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.kindRow}>
              {(Object.keys(KIND_LABEL) as BonusKind[]).map((kind) => (
                <button
                  key={kind}
                  className={cx(styles.kindBtn, form.kind === kind && styles.kindActive)}
                  onClick={() => setForm((f) => ({ ...f, kind }))}
                >
                  {KIND_LABEL[kind]}
                </button>
              ))}
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Значение</span>
              <input
                className={styles.input}
                value={form.value}
                placeholder="10% или 500 ₽"
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Срок действия</span>
              <input
                className={styles.input}
                value={form.expiresAt}
                placeholder="до конца месяца"
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </label>

            <Button fullWidth size="lg" onClick={createBonus}>
              Создать бонус
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
