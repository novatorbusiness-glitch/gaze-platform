import type { CSSProperties } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Crown,
  Lock,
  PlayCircle,
} from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { demoCourses } from '../lib/dev-data'
import type { Lesson } from '../lib/mock'
import { haptic } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import styles from './Course.module.css'

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Начальный',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

const CATEGORY_LABEL: Record<string, string> = {
  promotion: 'Продвижение',
  packaging: 'Упаковка',
  clients: 'Клиенты',
  technique: 'Техника',
}

/**
 * T10 — Страница курса академии: обложка, прогресс, список уроков-гидов.
 * T11 — урок считается пройденным, когда выполнено его задание
 *       (✍️-отметка в списке + галочка по выполнении).
 *
 * Курс «До 200к» — флагманская программа на 6 месяцев: уроки сгруппированы
 * по модулям-месяцам (1–6), на обложке — оффер «50–60к → 200к ₽/мес»,
 * при 100% прогресса доступен сертификат выпускника.
 */
export default function Course() {
  const courseId = useAppStore((s) => s.selectedCourseId)
  const goBack = useAppStore((s) => s.goBack)
  const openLesson = useAppStore((s) => s.openLesson)
  const completedLessons = useAppStore((s) => s.completedLessons)
  const assignments = useAppStore((s) => s.assignments)
  // G2 — премиум-курс: на базовом тарифе недоступен (страховка от прямого входа)
  const plan = useAppStore((s) => s.plan)
  const navigate = useAppStore((s) => s.navigate)
  // G1c — Сертификат выпускника (открывается по завершении курса)
  const openCertificate = useAppStore((s) => s.openCertificate)

  const course = demoCourses.find((c) => c.id === courseId) ?? null

  if (!course) {
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
          <span className={styles.headerTitle}>Курс не найден</span>
        </header>
      </div>
    )
  }

  /* G2 — Премиум-курс закрыт на базовом тарифе: замок вместо уроков */
  if (course.is_premium && plan !== 'premium') {
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            aria-label="Назад к академии"
            onClick={() => {
              haptic('light')
              goBack()
            }}
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <span className={styles.headerTitle}>Курс</span>
        </header>

        <div className={styles.lockedCard}>
          <span className={styles.lockedIcon}>
            <Lock size={28} strokeWidth={1.75} />
          </span>
          <span className={styles.lockedEmoji}>{course.coverEmoji}</span>
          <h1 className={styles.lockedTitle}>{course.title}</h1>
          <p className={styles.lockedText}>
            Этот премиум-курс доступен по тарифу «AI-маркетолог» (1 500 ₽/мес) вместе
            с генератором контента и 15 чит-кодами из «Нейро-Воронки».
          </p>
          <Button size="lg" fullWidth onClick={() => navigate('premium')}>
            <Crown size={16} strokeWidth={2} />
            Оплатить тариф — 1 500 ₽/мес
          </Button>
        </div>
      </div>
    )
  }

  /** T11 — урок пройден: выполнено задание (gaze_assignments) ИЛИ отмечен вручную (T10) */
  const isLessonDone = (lessonId: string) =>
    Boolean(
      completedLessons[lessonId] || assignments[`${course.id}_${lessonId}`]?.done,
    )

  const total = course.lessons.length
  const done = course.lessons.filter((l) => isLessonDone(l.id)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const modules = course.modules ?? []
  const hasModules = modules.length > 0

  const styleVars = { '--course-accent': course.accent } as CSSProperties

  /** Глобальный номер урока (1..30) для курса «До 200к» */
  const lessonIndex = (lessonId: string) =>
    course.lessons.findIndex((l) => l.id === lessonId) + 1

  /** Карточка одного урока (используется и в плоском списке, и внутри модулей) */
  const renderLesson = (lesson: Lesson) => {
    const isDone = isLessonDone(lesson.id)
    const assignDone = Boolean(assignments[`${course.id}_${lesson.id}`]?.done)
    return (
      <button
        key={lesson.id}
        className={cx(styles.lesson, isDone && styles.lessonDone)}
        onClick={() => {
          haptic('light')
          openLesson(course.id, lesson.id)
        }}
      >
        <span className={styles.lessonNum}>
          {isDone ? (
            <CheckCircle2 size={18} strokeWidth={2.2} className={styles.lessonDoneIcon} />
          ) : (
            lessonIndex(lesson.id)
          )}
        </span>
        <span className={styles.lessonBody}>
          <span className={styles.lessonTitle}>{lesson.title}</span>
          <span className={styles.lessonMeta}>
            {lesson.video ? '🎬 видео' : '📄 гид'} · {lesson.duration}
            {lesson.assignment && (
              <>
                {' '}·{' '}
                <span className={cx(styles.lessonAssign, assignDone && styles.lessonAssignDone)}>
                  {assignDone ? '✍️ задание ✓' : '✍️ задание'}
                </span>
              </>
            )}
          </span>
        </span>
        <ArrowRight size={16} strokeWidth={2} className={styles.lessonArrow} />
      </button>
    )
  }

  return (
    <div className={styles.screen} style={styleVars}>
      {/* Шапка */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          aria-label="Назад к академии"
          onClick={() => {
            haptic('light')
            goBack()
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <span className={styles.headerTitle}>Курс</span>
      </header>

      {/* Обложка курса */}
      <div className={styles.cover} style={styleVars}>
        <div className={styles.coverGlow} />
        <div className={styles.coverTop}>
          <Badge variant="accent">{CATEGORY_LABEL[course.category]}</Badge>
          <div className={styles.coverBadges}>
            <Badge variant="cta">{LEVEL_LABEL[course.level]}</Badge>
            {course.is_premium && (
              <Badge variant="cta">
                <Lock size={10} strokeWidth={2.5} />
                PREMIUM
              </Badge>
            )}
          </div>
        </div>
        <span className={styles.coverEmoji}>{course.coverEmoji}</span>
        <h1 className={styles.coverTitle}>{course.title}</h1>
        {course.offer && <div className={styles.coverOffer}>{course.offer}</div>}
        <p className={styles.coverSub}>{course.subtitle}</p>
        <div className={styles.coverMeta}>
          <span className={styles.coverMetaItem}>
            <PlayCircle size={14} strokeWidth={2} />
            {total} {total === 1 ? 'урок' : 'уроков'}
          </span>
          <span className={styles.coverMetaItem}>
            <Clock size={14} strokeWidth={2} />
            {course.lessons.reduce((acc, l) => acc + parseInt(l.duration, 10) || 0, 0)} мин
          </span>
          {course.readers ? (
            <span className={styles.coverMetaItem}>
              <CheckCircle2 size={14} strokeWidth={2} />
              {course.readers} мастеров
            </span>
          ) : null}
        </div>
      </div>

      {/* Прогресс */}
      <section className={styles.progress}>
        <div className={styles.progressHead}>
          <span className={styles.progressLabel}>Твой прогресс</span>
          <span className={styles.progressPct}>
            {done} из {total} · {pct}%
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </section>

      {/* Список уроков: по модулям-месяцам (для «До 200к») или плоский */}
      <section className={styles.lessons}>
        <h2 className={styles.lessonsTitle}>
          {hasModules ? 'Программа курса' : 'Уроки курса'}
        </h2>

        {hasModules ? (
          modules.map((mod) => {
            const ls = course.lessons.filter((l) => l.moduleId === mod.id)
            if (ls.length === 0) return null
            const mDone = ls.filter((l) => isLessonDone(l.id)).length
            return (
              <div key={mod.id} className={styles.module}>
                <div className={styles.moduleHead}>
                  <span className={styles.moduleEmoji}>{mod.emoji}</span>
                  <div className={styles.moduleHeadText}>
                    <h3 className={styles.moduleTitle}>{mod.title}</h3>
                    {mod.subtitle && <p className={styles.moduleSub}>{mod.subtitle}</p>}
                  </div>
                  <span className={styles.moduleMeta}>
                    {mDone}/{ls.length}
                  </span>
                </div>
                <div className={styles.lessonList}>{ls.map(renderLesson)}</div>
              </div>
            )
          })
        ) : (
          <div className={styles.lessonList}>{course.lessons.map(renderLesson)}</div>
        )}
      </section>

      {/* Сертификат — при 100% прогрессе */}
      {pct === 100 && total > 0 && (
        <section className={styles.certificate}>
          <span className={styles.certificateIcon}>
            <Award size={26} strokeWidth={1.75} />
          </span>
          <div className={styles.certificateText}>
            <span className={styles.certificateKicker}>Курс пройден полностью</span>
            <h2 className={styles.certificateTitle}>🎓 Сертификат выпускника</h2>
            <p className={styles.certificateDesc}>
              Все {total} уроков пройдены — забери сертификат «До 200к» и поделись результатом.
            </p>
          </div>
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              haptic('medium')
              openCertificate(6, 'course')
            }}
          >
            <Award size={16} strokeWidth={2} />
            Получить сертификат
          </Button>
        </section>
      )}
    </div>
  )
}
