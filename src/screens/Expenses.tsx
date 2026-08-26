import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, Receipt, Trash2 } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input, Textarea } from '../components/Input'
import {
  EXPENSE_CATEGORIES,
  addExpense,
  loadExpenses,
  monthExpensesTotal,
  removeExpense,
  summarizeExpenses,
  todayISO,
  type ExpenseCategory,
  type ExpenseRecord,
} from '../lib/expenses'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx, formatDate, formatMoney } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Expenses.module.css'

/**
 * T17 — ЭКРАН «РАСХОДЫ»
 *
 * Раньше расход можно было забить только при записи процедуры. Здесь — отдельный
 * учёт: материалы, аренда, реклама, инструменты, другое. Записи живут в
 * localStorage (gaze_expenses), на экране — список + «Итог за месяц» + форма
 * добавления. Расходы из gaze_expenses учитываются в юнит-экономике аналитики
 * (прибыль = доход − материалы из процедур − прочие расходы).
 */
export default function Expenses() {
  const goBack = useAppStore((s) => s.goBack)
  const isDemo = useMasterStore((s) => s.isDemo)

  const [records, setRecords] = useState<ExpenseRecord[]>(() => loadExpenses())
  const [showForm, setShowForm] = useState(false)

  // Поля формы
  const [category, setCategory] = useState<ExpenseCategory>('Материалы')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => todayISO())
  const [comment, setComment] = useState('')

  const monthSum = monthExpensesTotal(records)
  const monthCount = records.filter((e) => e.date.slice(0, 7) === todayISO().slice(0, 7)).length
  const byCategory = useMemo(() => summarizeExpenses(records), [records])
  const sorted = useMemo(
    () => [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [records],
  )

  const amountValue = Number(amount)
  const canSave = amountValue > 0 && date.trim() !== ''

  const onSave = () => {
    if (!canSave) return
    hapticSuccess()
    setRecords(addExpense(category, amountValue, date, comment))
    setAmount('')
    setComment('')
    setCategory('Материалы')
    setDate(todayISO())
    setShowForm(false)
  }

  const onDelete = (id: string) => {
    haptic('light')
    setRecords(removeExpense(id))
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
        <h1 className={styles.headerTitle}>Расходы</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </header>

      {/* Итог за месяц */}
      <Card className={styles.summaryCard}>
        <div className={styles.summaryHead}>
          <span className={styles.summaryIcon}>
            <Receipt size={18} strokeWidth={2} />
          </span>
          <span className={styles.summaryLabel}>Итог за месяц</span>
        </div>
        <div className={styles.summaryValue}>{formatMoney(monthSum)}</div>
        <div className={styles.summaryMeta}>
          <span className={styles.summaryMetaItem}>{monthCount} расходов за месяц</span>
          <span className={styles.summaryMetaItem}>всего {formatMoney(records.reduce((s, e) => s + e.amount, 0))}</span>
        </div>
        {/* Разбивка по категориям */}
        <div className={styles.categoryBreakdown}>
          {EXPENSE_CATEGORIES.filter((c) => byCategory[c] > 0).map((c) => (
            <span key={c} className={styles.categoryPill}>
              {c} · {formatMoney(byCategory[c])}
            </span>
          ))}
        </div>
      </Card>

      {/* Добавить расход */}
      <Button size="lg" fullWidth onClick={() => {
        haptic('medium')
        setShowForm((v) => !v)
      }}>
        <Plus size={17} strokeWidth={2.5} />
        {showForm ? 'Скрыть форму' : 'Добавить расход'}
      </Button>

      {/* Форма расхода */}
      {showForm && (
        <Card className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Новый расход</h2>

          {/* Категория — чипы */}
          <span className={styles.fieldLabel}>Категория</span>
          <div className={styles.chips}>
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={cx(styles.chip, category === c && styles.chipActive)}
                onClick={() => {
                  haptic('light')
                  setCategory(c)
                }}
                aria-pressed={category === c}
              >
                {c}
              </button>
            ))}
          </div>

          <Input
            label="Сумма, ₽"
            mono
            type="number"
            inputMode="numeric"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Например, 3000"
          />

          <Input
            label="Дата"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Textarea
            label="Комментарий (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Что купили / за что заплатили…"
          />

          <Button size="lg" fullWidth disabled={!canSave} onClick={onSave}>
            Сохранить · {canSave ? formatMoney(amountValue) : ''}
          </Button>
        </Card>
      )}

      {/* Список расходов */}
      {sorted.length > 0 ? (
        <div className="stagger">
          {sorted.map((expense) => (
            <Card key={expense.id} className={styles.expenseCard}>
              <div className={styles.expenseBody}>
                <span className={styles.expenseCategory}>{expense.category}</span>
                <span className={styles.expenseDate}>{formatDate(expense.date)}</span>
                {expense.comment && <span className={styles.expenseComment}>{expense.comment}</span>}
              </div>
              <div className={styles.expenseRight}>
                <span className={styles.expenseAmount}>−{formatMoney(expense.amount)}</span>
                <button
                  className={styles.deleteBtn}
                  aria-label={`Удалить расход ${expense.category}`}
                  onClick={() => onDelete(expense.id)}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className={styles.emptyCard}>
          <p className={styles.emptyText}>Пока нет записанных расходов.</p>
        </Card>
      )}

      <p className={styles.hint}>
        Расходы учитываются в юнит-экономике аналитики: прибыль = доход − материалы из процедур −
        прочие расходы. Записи хранятся в localStorage (<span className={styles.mono}>gaze_expenses</span>).
      </p>
    </div>
  )
}
