import Button from './Button'
import Card from './Card'
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
}

/** Общее состояние ошибки: карточка с dashed-рамкой + кнопка повтора */
export default function ErrorState({
  title = 'Что-то пошло не так',
  message,
  onRetry,
  retryLabel = 'Попробовать снова',
}: ErrorStateProps) {
  return (
    <Card className={styles.card}>
      <p className={styles.title}>{title}</p>
      <p className={styles.text}>{message}</p>
      {onRetry && (
        <Button fullWidth onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Card>
  )
}
