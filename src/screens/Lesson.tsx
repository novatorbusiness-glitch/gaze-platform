import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Lock,
  Play,
  Video,
} from 'lucide-react'
import Badge from '../components/Badge'
import RichText from '../components/RichText'
import SchemaDiagram from '../components/SchemaDiagram'
import { demoCourses } from '../lib/dev-data'
import { haptic } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Lesson.module.css'

/**
 * T10 — Страница урока (гида) академии:
 *   заголовок H1, видео-плейсхолдер (опционально), богатый текст
 *   (заголовки/списки/💡/⚠️/схемы), кнопка «Урок пройден».
 * T11 — в конце урока блок «📝 Задание» (практика): текст задания +
 *   ответ (textarea или чек-лист) + кнопка «Выполнил(а)». Урок засчитывается
 *   пройденным, когда задание выполнено; состояние — в gaze_assignments.
 */
export default function Lesson() {
  const courseId = useAppStore((s) => s.selectedCourseId)
  const lessonId = useAppStore((s) => s.selectedLessonId)
  const goBack = useAppStore((s) => s.goBack)
  const openLesson = useAppStore((s) => s.openLesson)
  const completedLessons = useAppStore((s) => s.completedLessons)
  const markLessonCompleted = useAppStore((s) => s.markLessonCompleted)
  const assignments = useAppStore((s) => s.assignments)
  const saveAssignment = useAppStore((s) => s.saveAssignment)

  const [playing, setPlaying] = useState(false)

  // T11 — ответ/чек-лист задания
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const course = demoCourses.find((c) => c.id === courseId) ?? null
  const lesson = course?.lessons.find((l) => l.id === lessonId) ?? null

  // T11 — сброс формы при переходе между уроками (компонент не перемонтируется)
  const assignmentKey = course && lesson ? `${course.id}_${lesson.id}` : ''
  const assignmentSaved = assignmentKey ? assignments[assignmentKey] : undefined
  useEffect(() => {
    setAnswer(assignmentSaved?.answer ?? '')
    setChecked({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  if (!course || !lesson) {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            aria-label="Назад"
            onClick={() => {
              haptic('light')
              goBack()
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <span className={styles.headerTitle}>Урок не найден</span>
        </header>
      </div>
    )
  }

  const assignment = lesson.assignment ?? null
  const assignmentDone = Boolean(assignmentSaved?.done)
  const done = Boolean(completedLessons[lesson.id] || assignmentDone)
  const hasAssignment = Boolean(assignment)

  /** T11 — выполнить задание: сохранить ответ + отметить урок пройденным */
  const submitAssignment = () => {
    haptic('medium')
    let answerText = answer.trim()
    if (assignment?.type === 'checklist') {
      answerText = (assignment.items ?? [])
        .filter((_, i) => checked[i])
        .map((t) => `✓ ${t}`)
        .join('\n')
    }
    saveAssignment(course.id, lesson.id, { done: true, answer: answerText })
    markLessonCompleted(lesson.id)
  }

  const checklistDone = Object.values(checked).some(Boolean)
  const canSubmit =
    !assignment || assignmentDone
      ? false
      : assignment.type === 'text'
        ? answer.trim().length > 0
        : checklistDone

  return (
    <div className={styles.screen}>
      {/* Шапка: назад + название курса */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          aria-label="Назад к курсу"
          onClick={() => {
            haptic('light')
            setPlaying(false)
            goBack()
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.headerKicker}>{course.coverEmoji} {course.title}</span>
          {done && <Badge variant="success">ПРОЙДЕН</Badge>}
        </div>
      </header>

      {/* Видео-плейсхолдер (опционально, демо) */}
      {lesson.video && (
        <div className={styles.video}>
          <div className={styles.videoGlow} />
          <span className={styles.videoEmoji}>{playing ? '▶️' : lesson.video.previewEmoji}</span>
          <button
            className={styles.playBtn}
            aria-label={playing ? 'Видео — демо-режим' : 'Смотреть видео'}
            onClick={() => {
              haptic('medium')
              setPlaying((v) => !v)
            }}
          >
            <Play size={22} strokeWidth={2.2} fill="currentColor" />
          </button>
          {playing ? (
            <span className={styles.videoBadge}>
              <Video size={12} strokeWidth={2.2} />
              Демо: видео появится в следующей версии
            </span>
          ) : (
            <span className={styles.videoBadge}>{lesson.video.duration}</span>
          )}
        </div>
      )}

      {/* Заголовок урока */}
      <h1 className={styles.title}>{lesson.title}</h1>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Clock size={13} strokeWidth={2} />
          {lesson.duration}
        </span>
        {lesson.video && (
          <span className={styles.metaItem}>
            <Video size={13} strokeWidth={2} />
            Видео-урок
          </span>
        )}
        {assignment && (
          <span className={styles.metaItem}>
            <ClipboardList size={13} strokeWidth={2} />
            Задание
          </span>
        )}
        {course.is_premium && (
          <span className={styles.metaItem}>
            <Badge variant="cta">PREMIUM</Badge>
          </span>
        )}
      </div>

      {/* Схема — сразу под заголовком, чтобы «вау» в первые секунды */}
      {lesson.schema && <SchemaDiagram schema={lesson.schema} accent={course.accent} />}

      {/* Богатый текст гида */}
      <RichText content={lesson.content} />

      {/* T11 — Практическое задание в конце урока */}
      {assignment && (
        <section className={cx(styles.assignment, assignmentDone && styles.assignmentDone)}>
          <div className={styles.assignmentHead}>
            <span className={styles.assignmentIcon}>
              <ClipboardList size={18} strokeWidth={2} />
            </span>
            <div className={styles.assignmentHeadText}>
              <span className={styles.assignmentKicker}>Практика · {lesson.duration}</span>
              <h2 className={styles.assignmentTitle}>📝 Задание</h2>
            </div>
          </div>

          <p className={styles.assignmentTask}>{assignment.task}</p>
          {assignment.hint && (
            <div className={styles.assignmentHint}>
              <span>💡</span>
              <span>{assignment.hint}</span>
            </div>
          )}

          {assignmentDone ? (
            <div className={styles.assignmentSuccess}>
              <CheckCircle2 size={16} strokeWidth={2.2} />
              Задание выполнено — урок засчитан пройденным
            </div>
          ) : assignment.type === 'text' ? (
            <>
              <textarea
                className={styles.assignmentInput}
                placeholder="Напиши свой ответ здесь…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={4}
              />
              <button
                className={styles.assignmentBtn}
                disabled={!canSubmit}
                onClick={submitAssignment}
              >
                <Check size={16} strokeWidth={2.4} />
                Выполнил(а) задание
              </button>
            </>
          ) : (
            <>
              <div className={styles.assignmentList}>
                {(assignment.items ?? []).map((item, i) => (
                  <label key={i} className={styles.assignmentItem}>
                    <input
                      type="checkbox"
                      className={styles.assignmentCheck}
                      checked={Boolean(checked[i])}
                      onChange={(e) =>
                        setChecked((c) => ({ ...c, [i]: e.target.checked }))
                      }
                    />
                    <span className={styles.assignmentItemText}>{item}</span>
                  </label>
                ))}
              </div>
              <button
                className={styles.assignmentBtn}
                disabled={!canSubmit}
                onClick={submitAssignment}
              >
                <Check size={16} strokeWidth={2.4} />
                Выполнил(а) задание
              </button>
            </>
          )}
        </section>
      )}

      {/* Завершение урока */}
      <button
        className={cx(
          styles.completeBtn,
          done && styles.completeBtnDone,
          hasAssignment && !done && styles.completeBtnLocked,
        )}
        disabled={hasAssignment && !done}
        onClick={() => {
          haptic('medium')
          markLessonCompleted(lesson.id)
        }}
      >
        {done ? (
          <>
            <CheckCircle2 size={18} strokeWidth={2.2} />
            Урок пройден ✓
          </>
        ) : hasAssignment ? (
          <>
            <Lock size={18} strokeWidth={2.2} />
            Сначала выполни задание
          </>
        ) : (
          <>
            <Check size={18} strokeWidth={2.2} />
            Отметить урок пройденным
          </>
        )}
      </button>

      {/* Навигация по урокам курса */}
      {(() => {
        const idx = course.lessons.findIndex((l) => l.id === lesson.id)
        const next = course.lessons[idx + 1]
        const prev = course.lessons[idx - 1]
        return (
          <div className={styles.nav}>
            {prev ? (
              <button
                className={styles.navBtn}
                onClick={() => {
                  haptic('light')
                  openLesson(course.id, prev.id)
                }}
              >
                <ArrowLeft size={15} strokeWidth={2} />
                Предыдущий
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                className={styles.navBtn}
                onClick={() => {
                  haptic('light')
                  openLesson(course.id, next.id)
                }}
              >
                Следующий
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            ) : (
              <button
                className={styles.navBtn}
                onClick={() => {
                  haptic('light')
                  goBack()
                }}
              >
                В курс
              </button>
            )}
          </div>
        )
      })()}
    </div>
  )
}
