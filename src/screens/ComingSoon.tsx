import Badge from '../components/Badge'
import Card from '../components/Card'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Placeholder.module.css'

interface ComingSoonProps {
  title: string
  description: string
}

/** Заглушка для экранов этапа 2 (Analytics / Profile) */
export default function ComingSoon({ title, description }: ComingSoonProps) {
  const isDemo = useMasterStore((s) => s.isDemo)

  return (
    <div className={styles.screen}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>
        {isDemo && <Badge variant="demo">DEMO</Badge>}
      </div>
      <Card className={styles.card}>
        <p className={styles.text}>{description}</p>
        <span className={styles.tag}>ЭТАП 2 · SUPABASE</span>
      </Card>
    </div>
  )
}
