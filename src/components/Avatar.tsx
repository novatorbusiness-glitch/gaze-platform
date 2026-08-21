import { cx } from '../lib/utils'
import { initials } from '../lib/utils'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Чередование фонов: --app-accent / --app-bg (ТЗ, экран Clients) */
  alt?: boolean
}

export default function Avatar({ name, size = 'md', alt = false }: AvatarProps) {
  return (
    <div className={cx(styles.avatar, styles[size], alt && styles.alt)} aria-hidden="true">
      {initials(name)}
    </div>
  )
}
