import Card from './Card'
import styles from './MetricCard.module.css'

interface MetricCardProps {
  label: string
  value: string
  /** Крупная цифра — JetBrains Mono 700, 36px (по ТЗ) */
  size?: 'lg' | 'md'
  /** T9.2 — маленькая подпись под цифрой, напр. «маржа 67%» */
  caption?: string
}

/** Conceptual Card с тонкой рамкой. Цифра крупная, JetBrains Mono. */
export default function MetricCard({ label, value, size = 'lg', caption }: MetricCardProps) {
  return (
    <Card className={styles.metric}>
      <span className={styles.label}>{label}</span>
      <span className={styles[size]}>{value}</span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </Card>
  )
}
