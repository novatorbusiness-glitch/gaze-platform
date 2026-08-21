import { ChevronRight } from 'lucide-react'
import Avatar from './Avatar'
import { cx, formatMoney } from '../lib/utils'
import styles from './ClientRow.module.css'

interface ClientRowProps {
  name: string
  date: string
  amount: number
  altAvatar?: boolean
  onClick?: () => void
  /** Дополнительная строка под датой (напр. «Общий чек: …») */
  subtitle?: string
}

/** Мини-карточка-строка клиента: аватар · имя · дата · сумма · → (ТЗ, экран Dashboard/Clients) */
export default function ClientRow({
  name,
  date,
  amount,
  altAvatar = false,
  onClick,
  subtitle,
}: ClientRowProps) {
  return (
    <div className={cx(styles.row, onClick && styles.clickable)} onClick={onClick}>
      <Avatar name={name} size="md" alt={altAvatar} />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meta}>
          {date}
          {subtitle ? ` · ${subtitle}` : ''}
        </span>
      </div>
      <span className={styles.amount}>{formatMoney(amount)}</span>
      {onClick && <ChevronRight size={18} className={styles.chevron} strokeWidth={1.75} />}
    </div>
  )
}
