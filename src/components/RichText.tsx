import type { ReactNode } from 'react'
import styles from './RichText.module.css'

/**
 * T10 — Рендер богатого текста урока (лёгкий markdown).
 *
 * Понимает:
 *   ## / ### / ####  — заголовки-разделы
 *   - пункт           — маркированный список (группируются)
 *   1) пункт          — нумерованный список (группируются)
 *   > цитата          — цитата/скрипт
 *   💡 Совет: …       — бокс-подсказка (blush)
 *   ⚠️ Важно: …       — бокс-предупреждение (тёплый оранж)
 *   → действие        — CTA-строка «сделай сейчас»
 *   ---               — разделитель
 *   **жирный**, *курсив*, `код` — внутри строк
 */

type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'warn'; text: string }
  | { type: 'cta'; text: string }
  | { type: 'hr' }

/** Разбор markdown-текста на блоки (с группировкой соседних пунктов списков) */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = []
  let ul: string[] | null = null
  let ol: string[] | null = null

  const flush = () => {
    if (ul) {
      blocks.push({ type: 'ul', items: ul })
      ul = null
    }
    if (ol) {
      blocks.push({ type: 'ol', items: ol })
      ol = null
    }
  }

  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (/^#{2}\s+/.test(line)) {
      flush()
      blocks.push({ type: 'h2', text: line.replace(/^#{2}\s+/, '') })
      continue
    }
    if (/^#{3}\s+/.test(line)) {
      flush()
      blocks.push({ type: 'h3', text: line.replace(/^#{3}\s+/, '') })
      continue
    }
    if (/^#{4,6}\s+/.test(line)) {
      flush()
      blocks.push({ type: 'h4', text: line.replace(/^#{4,6}\s+/, '') })
      continue
    }
    if (/^-\s+/.test(line)) {
      flush()
      ul = []
      ol = null
      ul.push(line.replace(/^-\s+/, ''))
      continue
    }
    // Продолжаем текущий маркированный список, пока идут пункты «- »
    if (ul && /^-\s+/.test(line)) {
      ul.push(line.replace(/^-\s+/, ''))
      continue
    }
    if (/^\d+[).]\s+/.test(line)) {
      flush()
      ol = []
      ul = null
      ol.push(line.replace(/^\d+[).]\s+/, ''))
      continue
    }
    if (ol && /^\d+[).]\s+/.test(line)) {
      ol.push(line.replace(/^\d+[).]\s+/, ''))
      continue
    }
    if (/^>\s?/.test(line)) {
      flush()
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') })
      continue
    }
    if (/^💡/.test(line)) {
      flush()
      blocks.push({ type: 'tip', text: line.replace(/^💡\s*/, '') })
      continue
    }
    if (/^⚠️?/.test(line)) {
      flush()
      blocks.push({ type: 'warn', text: line.replace(/^⚠️?\s*/, '') })
      continue
    }
    if (/^→/.test(line)) {
      flush()
      blocks.push({ type: 'cta', text: line.replace(/^→\s*/, '') })
      continue
    }
    if (/^-{3,}$/.test(line)) {
      flush()
      blocks.push({ type: 'hr' })
      continue
    }
    flush()
    blocks.push({ type: 'p', text: line })
  }
  flush()
  return blocks
}

/** Инлайн-разметка: **жирный**, *курсив*, `код` → React-ноды */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b${k}`}>{renderInline(tok.slice(2, -2), `${keyPrefix}-b${k}`)}</strong>,
      )
    } else if (tok.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${k}`}>{tok.slice(1, -1)}</code>)
    } else {
      nodes.push(<em key={`${keyPrefix}-i${k}`}>{tok.slice(1, -1)}</em>)
    }
    last = m.index + tok.length
    k++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

interface RichTextProps {
  content: string
}

/** Богатый текст урока: заголовки, списки, выделения, боксы-подсказки, CTA */
export default function RichText({ content }: RichTextProps) {
  const blocks = parseBlocks(content)

  return (
    <div className={styles.rich}>
      {blocks.map((block, i) => {
        const key = `b-${i}`
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={key} className={styles.h2}>
                {renderInline(block.text, key)}
              </h2>
            )
          case 'h3':
            return (
              <h3 key={key} className={styles.h3}>
                {renderInline(block.text, key)}
              </h3>
            )
          case 'h4':
            return (
              <h4 key={key} className={styles.h4}>
                {renderInline(block.text, key)}
              </h4>
            )
          case 'ul':
            return (
              <ul key={key} className={styles.ul}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key} className={styles.ol}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            )
          case 'quote':
            return (
              <blockquote key={key} className={styles.quote}>
                {renderInline(block.text, key)}
              </blockquote>
            )
          case 'tip':
            return (
              <div key={key} className={styles.tip} role="note">
                <span className={styles.tipIcon}>💡</span>
                <span className={styles.tipText}>{renderInline(block.text, key)}</span>
              </div>
            )
          case 'warn':
            return (
              <div key={key} className={styles.warn} role="note">
                <span className={styles.warnIcon}>⚠️</span>
                <span className={styles.warnText}>{renderInline(block.text, key)}</span>
              </div>
            )
          case 'cta':
            return (
              <div key={key} className={styles.cta}>
                <span className={styles.ctaArrow}>→</span>
                <span>{renderInline(block.text, key)}</span>
              </div>
            )
          case 'hr':
            return <hr key={key} className={styles.hr} />
          default:
            return (
              <p key={key} className={styles.p}>
                {renderInline(block.text, key)}
              </p>
            )
        }
      })}
    </div>
  )
}
