import { cx } from '../lib/utils'
import styles from './SkeletonLoader.module.css'

type SkeletonShape = 'text' | 'title' | 'avatar' | 'card' | 'button'

interface SkeletonLoaderProps {
  shape?: SkeletonShape
  width?: string | number
  height?: string | number
  className?: string
}

/** Мерцающая плашка --app-accent opacity 0.1 (ТЗ, Часть 1 — skeleton loading) */
export default function SkeletonLoader({ shape = 'text', width, height, className }: SkeletonLoaderProps) {
  return (
    <div
      className={cx(styles.block, styles[shape], className)}
      style={{ width: width ?? undefined, height: height ?? undefined }}
    />
  )
}
