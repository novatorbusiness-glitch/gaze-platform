import { useMemo, useState } from 'react'
import { ArrowLeft, Award, Download, PartyPopper } from 'lucide-react'
import Badge from '../components/Badge'
import Button from '../components/Button'
import { buildCertificateSvg, certificateDataFor, downloadCertificatePng } from '../lib/certificate'
import { getPathLevel } from '../lib/path'
import { haptic, hapticSuccess } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { useMasterStore } from '../store/useMasterStore'
import styles from './Certificate.module.css'

/**
 * G1c — ЭКРАН «СЕРТИФИКАТ»:
 * показывает SVG-сертификат GAZE PATH (имя мастера, достигнутый уровень
 * и пройденные уровни) и даёт скачать его как PNG. Открывается поверх,
 * без таббара — из экрана «Путь роста» (кнопка «Получить сертификат»).
 */
export default function Certificate() {
  const goBack = useAppStore((s) => s.goBack)
  const level = useAppStore((s) => s.certificateLevel)
  const master = useMasterStore((s) => s.master)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pathLevel = getPathLevel(level)
  const data = useMemo(() => certificateDataFor(master?.name ?? 'Мастер', level), [master?.name, level])
  const svgMarkup = useMemo(() => buildCertificateSvg(data), [data])

  const onDownload = async () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    try {
      await downloadCertificatePng(data)
      hapticSuccess()
      setSaved(true)
    } catch {
      haptic('medium')
      /* Недоступен canvas/Blob — сертификат всё равно виден на экране */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button
          className={styles.back}
          aria-label="Назад"
          onClick={() => {
            haptic('light')
            goBack()
          }}
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Сертификат</h1>
          <p className={styles.subtitle}>
            {pathLevel.emoji} Уровень {level} · «{pathLevel.name}»
          </p>
        </div>
        <Badge variant="accent" className={styles.headerBadge}>
          GAZE PATH
        </Badge>
      </header>

      {/* Сам сертификат: SVG встраивается строкой (тот же источник для PNG) */}
      <div className={styles.certWrap} dangerouslySetInnerHTML={{ __html: svgMarkup }} />

      <div className={styles.actions}>
        <Button size="lg" fullWidth onClick={onDownload} disabled={saving}>
          {saved ? <PartyPopper size={16} strokeWidth={2.2} /> : <Download size={16} strokeWidth={2.2} />}
          {saving ? 'Готовим PNG…' : saved ? 'Скачано ✓' : 'Скачать PNG'}
        </Button>
        <p className={styles.hint}>
          <Award size={13} strokeWidth={2} />
          Сертификат можно поделиться в сторис и соцсетях — это твой результат на пути к 200к+.
        </p>
      </div>

      <button className={styles.closeBtn} onClick={goBack}>
        Назад к пути
      </button>
    </div>
  )
}
