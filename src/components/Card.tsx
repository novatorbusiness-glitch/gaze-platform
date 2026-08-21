import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../lib/utils'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  /** Conceptual Card — тонкая рамка + тень (по ТЗ) */
  elevated?: boolean
}

export default function Card({ children, className, style, onClick, elevated = false }: CardProps) {
  return (
    <div
      className={cx(styles.card, elevated && styles.elevated, onClick && styles.clickable, className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
