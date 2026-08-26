import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/utils'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Моноширинное значение (цифры и т.п.) */
  mono?: boolean
}

/** Инпут с floating label: рамка снизу, focus → --app-accent (ТЗ, Часть 1).
 *  ВАЖНО: <input> стоит В DOM ПЕРЕД <span class="label"> — floating-механика
 *  в Input.module.css использует соседний селектор (`.input ~ .label`). */
export function Input({ label, mono = false, className, ...rest }: InputProps) {
  // Если передан настоящий placeholder («2500», «Например, Мария»…), подпись
  // всегда держим сверху (styles.floating), чтобы она не пересекалась с подсказкой внутри поля.
  const hasPlaceholder = typeof rest.placeholder === 'string' && rest.placeholder.trim() !== ''
  return (
    <label className={cx(styles.field, hasPlaceholder && styles.floating, className)}>
      <input className={cx(styles.input, mono && styles.mono)} placeholder=" " {...rest} />
      <span className={styles.label}>{label}</span>
    </label>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function Textarea({ label, className, ...rest }: TextareaProps) {
  const hasPlaceholder = typeof rest.placeholder === 'string' && rest.placeholder.trim() !== ''
  return (
    <label className={cx(styles.field, hasPlaceholder && styles.floating, className)}>
      <textarea className={cx(styles.input, styles.textarea)} placeholder=" " rows={3} {...rest} />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
