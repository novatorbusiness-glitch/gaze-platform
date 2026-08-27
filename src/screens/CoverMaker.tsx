import { useRef, useState } from 'react'
import { ArrowLeft, Download, Images, LayoutTemplate, Sparkles } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { Input } from '../components/Input'
import {
  COVER_FORMATS,
  COVER_TEMPLATES,
  exportCoverPng,
  type CoverFormatId,
  type CoverTemplateId,
} from '../lib/cover'
import { getDisplayName } from '../lib/name'
import { haptic, hapticSuccess } from '../lib/telegram'
import { cx } from '../lib/utils'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './CoverMaker.module.css'

/* ------------------------------------------------------------------ */
/* ГЕНЕРАТОР ОБЛОЖЕК: текст + шаблон → SVG-превью → PNG (скачать)      */
/* ------------------------------------------------------------------ */

const SAMPLE_TEXTS = { title: 'Заголовок', subtitle: 'Подзаголовок', name: 'Имя' }

export default function CoverMaker() {
  const goBack = useAppStore((s) => s.goBack)
  const master = useMasterStore((s) => s.master)

  const [formatId, setFormatId] = useState<CoverFormatId>('stories')
  const [templateId, setTemplateId] = useState<CoverTemplateId>('minimal')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [name, setName] = useState(() => getDisplayName(master) || '')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewRef = useRef<SVGSVGElement>(null)

  const format = COVER_FORMATS.find((f) => f.id === formatId) ?? COVER_FORMATS[0]
  const template = COVER_TEMPLATES.find((t) => t.id === templateId) ?? COVER_TEMPLATES[0]
  const texts = { title, subtitle, name }

  const hasContent = Boolean(title.trim() || subtitle.trim() || name.trim())

  const onDownload = async () => {
    if (!previewRef.current) return
    setExporting(true)
    setError(null)
    haptic('medium')
    try {
      await exportCoverPng(
        previewRef.current,
        format.width,
        format.height,
        `gaze-cover-${format.id}-${template.id}.png`,
      )
      hapticSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось скачать PNG')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.screen}>
      {/* Шапка */}
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
        <span className={styles.headerTitle}>Генератор обложек</span>
      </header>

      {/* Герой */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.heroKicker}>
          <Images size={12} strokeWidth={2.5} />
          МАРКЕТИНГ · СВОИМИ РУКАМИ
        </span>
        <h1 className={styles.heroTitle}>Обложки для сторис и постов</h1>
        <p className={styles.heroSub}>
          Напишите заголовок, подзаголовок и имя — GAZE соберёт готовую обложку
          в фирменном стиле. Скачайте PNG 1080px и публикуйте.
        </p>
        <div className={styles.heroBadges}>
          <Badge variant="cta">1080 px</Badge>
          <Badge variant="accent">Сторис и посты</Badge>
        </div>
      </div>

      {/* Формат */}
      <Card className={styles.formCard}>
        <span className={styles.fieldLabel}>Формат</span>
        <div className={styles.chips}>
          {COVER_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cx(styles.chip, formatId === f.id && styles.chipActive)}
              onClick={() => {
                haptic('light')
                setFormatId(f.id)
              }}
            >
              <span className={styles.chipLabel}>{f.label}</span>
              <span className={styles.chipShort}>{f.short}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Шаблон */}
      <Card className={styles.formCard}>
        <span className={styles.fieldLabel}>Шаблон</span>
        <div className={styles.templates}>
          {COVER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cx(styles.template, templateId === t.id && styles.templateActive)}
              onClick={() => {
                haptic('light')
                setTemplateId(t.id)
              }}
            >
              <span className={styles.templatePreview}>{t.renderCover(format, SAMPLE_TEXTS)}</span>
              <span className={styles.templateLabel}>{t.label}</span>
              <span className={styles.templateHint}>{t.hint}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Текст */}
      <Card className={styles.formCard}>
        <span className={styles.fieldLabel}>Текст</span>
        <Input
          label="Заголовок"
          placeholder="Например, Маникюр в сентябре"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
        />
        <Input
          label="Подзаголовок"
          placeholder="Например, свободные окошки"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={80}
        />
        <Input
          label="Имя мастера"
          placeholder="Например, Анна"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
      </Card>

      {/* Превью */}
      <div>
        <h2 className={styles.sectionTitle}>
          <LayoutTemplate size={16} strokeWidth={2.2} />
          Превью
          <span className={styles.sectionMeta}>
            {format.label} · {format.short}
          </span>
        </h2>
        <Card className={styles.previewCard}>{template.renderCover(format, texts, previewRef)}</Card>
      </div>

      {/* Скачать */}
      <Button size="lg" fullWidth onClick={onDownload} disabled={!hasContent || exporting}>
        <Download size={16} strokeWidth={2} />
        {exporting ? 'Готовим PNG…' : 'Скачать PNG'}
      </Button>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.hint}>
        <Sparkles size={12} strokeWidth={2} className={styles.hintIcon} />
        Обложка рендерится в SVG и сохраняется как PNG 1080px — с встроенным
        шрифтом Montserrat, как в превью.
      </p>
    </div>
  )
}
