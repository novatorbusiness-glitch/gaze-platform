import Card from '../components/Card'
import styles from './Placeholder.module.css'

interface ComingSoonProps {
  title: string
  description: string
}

/** Заглушка для экранов этапа 2 (Analytics / Knowledge / Profile) */
export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{title}</h1>
      <Card className={styles.card}>
        <p className={styles.text}>{description}</p>
        <span className={styles.tag}>ЭТАП 2 · SUPABASE</span>
      </Card>
    </div>
  )
}
