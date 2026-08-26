import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Play, Video } from 'lucide-react'
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
 */
export default function Lesson() {
  const courseId = useAppStore((s) => s.selectedCourseId)
  const lessonId = useAppStore((s) => s.selectedLessonId)
  const goBack = useAppStore((s) => s.goBack)
  const openLesson = useAppStore((s) => s.openLesson)
  const completedLessons = useAppStore((s) => s.completedLessons)
  const markLessonCompleted = useAppStore((s) => s.markLessonCompleted)

  const [playing, setPlaying] = useState(false)

  const course = demoCourses.find((c) => c.id === courseId) ?? null
  const lesson = course?.lessons.find((l) => l.id === lessonId) ?? null

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

  const done = Boolean(completedLessons[lesson.id])

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

      {/* Завершение урока */}
      <button
        className={cx(styles.completeBtn, done && styles.completeBtnDone)}
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
