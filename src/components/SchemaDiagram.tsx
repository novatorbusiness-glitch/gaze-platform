import type { CSSProperties } from 'react'
import { ArrowRight, Workflow } from 'lucide-react'
import type { LessonSchema } from '../lib/mock'
import { cx } from '../lib/utils'
import styles from './SchemaDiagram.module.css'

/**
 * T10 — Визуальная схема урока:
 *   • flow  — горизонтальный поток этапов «Шаг 1 → Шаг 2 → Шаг 3» (pill-карточки со стрелками)
 *   • steps — нумерованные карточки-этапы с иконкой и пояснением (вертикальная рейка)
 */

interface SchemaDiagramProps {
  schema: LessonSchema
  accent?: string
}

export default function SchemaDiagram({ schema, accent }: SchemaDiagramProps) {
  return (
    <div className={styles.wrap}>
      {schema.title && (
        <div className={styles.head}>
          <Workflow size={16} strokeWidth={2} className={styles.headIcon} />
          <span className={styles.headTitle}>{schema.title}</span>
        </div>
      )}

      {schema.flow && schema.flow.length > 0 && (
        <div className={styles.flow} style={accent ? ({ '--flow-accent': accent } as CSSProperties) : undefined}>
          {schema.flow.map((node, i) => (
            <div key={`${node}-${i}`} className={styles.flowStep}>
              <span className={styles.flowNode}>{node}</span>
              {i < schema.flow!.length - 1 && <ArrowRight size={15} strokeWidth={2.2} className={styles.flowArrow} />}
            </div>
          ))}
        </div>
      )}

      {schema.steps && schema.steps.length > 0 && (
        <div className={styles.steps}>
          {schema.steps.map((step, i) => (
            <div key={`${step.title}-${i}`} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <span className={cx(styles.stepIcon, styles.stepIconBubble)}>{step.icon ?? '•'}</span>
              <div className={styles.stepBody}>
                <span className={styles.stepTitle}>{step.title}</span>
                {step.text && <span className={styles.stepText}>{step.text}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
