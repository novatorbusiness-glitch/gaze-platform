import Card from './Card'
import styles from './MetricCard.module.css'

interface MetricCardProps {
  label: string
  value: string
  /** Крупная цифра — JetBrains Mono 700, 36px (по ТЗ) */
  size?: 'lg' | 'md'
}

/** Conceptual Card с тонкой рамкой. Цифра крупная, JetBrains Mono. */
export default function MetricCard({ label, value, size = 'lg' }: MetricCardProps) {
  return (
    <Card className={styles.metric}>
      <span className={styles.label}>{label}</span>
      <span className={styles[size]}>{value}</span>
    </Card>
  )
}
