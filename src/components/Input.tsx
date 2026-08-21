import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/utils'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Моноширинное значение (цифры и т.п.) */
  mono?: boolean
}

/** Инпут с floating label: рамка снизу, focus → --app-accent (ТЗ, Часть 1) */
export function Input({ label, mono = false, className, ...rest }: InputProps) {
  return (
    <label className={cx(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      <input className={cx(styles.input, mono && styles.mono)} placeholder=" " {...rest} />
    </label>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function Textarea({ label, className, ...rest }: TextareaProps) {
  return (
    <label className={cx(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      <textarea className={cx(styles.input, styles.textarea)} placeholder=" " rows={3} {...rest} />
    </label>
  )
}
