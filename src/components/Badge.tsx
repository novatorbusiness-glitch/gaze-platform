import type { ReactNode } from 'react'
import { cx } from '../lib/utils'
import styles from './Badge.module.css'

type BadgeVariant = 'accent' | 'success' | 'warning' | 'cta' | 'demo'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

/** Pill-badge: JetBrains Mono 500, 11px, uppercase, letter-spacing 0.08em */
export default function Badge({ children, variant = 'accent', className }: BadgeProps) {
  return <span className={cx(styles.badge, styles[variant], className)}>{children}</span>
}
