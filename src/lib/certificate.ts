/**
 * G1c — Генератор сертификата GAZE PATH (техническая часть).
 *
 * Строит SVG-сертификат в фирменных цветах GAZE (кремовый фон #F9F8F6,
 * блаш #E0C7C0, тёплый акцент #6B5E53) и отдаёт готовую PNG-картинку:
 * SVG → canvas → Blob → download. Без внешних зависимостей.
 *
 * Данные: имя мастера, достигнутый уровень PATH и пройденные уровни
 * («достижения»). Экран-обёртка — src/screens/Certificate.tsx, вход —
 * из «Пути роста» (src/screens/Path.tsx).
 */
import { PATH_LEVELS, getPathLevel } from './path'

/** Размер сертификата (landscape, ~пропорции A4-landscape) */
export const CERTIFICATE_WIDTH = 1200
export const CERTIFICATE_HEIGHT = 850

/** Одно «достижение» на сертификате = пройденный уровень PATH */
export interface CertificateAchievement {
  /** Номер уровня (1–6) */
  level: number
  /** Название уровня, напр. «База» */
  name: string
  /** Эмодзи уровня */
  emoji: string
  /** Цель уровня, напр. «80–100к» */
  goalLabel: string
}

/** Всё, что попадает на сертификат */
export interface CertificateData {
  /** Имя мастера, напр. «Анна Казак» */
  masterName: string
  /** Текущий (достигнутый) уровень — на него выдаётся сертификат */
  level: number
  levelName: string
  levelEmoji: string
  /** Цель достигнутого уровня, напр. «80–100к» */
  levelGoalLabel: string
  /** Пройденные уровни ниже текущего (становятся списком достижений) */
  achievements: CertificateAchievement[]
  /** Дата выдачи, напр. «27 августа 2026» */
  dateLabel: string
}

/**
 * Собирает данные сертификата из уровня и имени мастера:
 * достижения = все пройденные уровни (level < текущего), дата — сегодня.
 */
export function certificateDataFor(masterName: string, level: number): CertificateData {
  const pl = getPathLevel(level)
  const dateLabel = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const achievements: CertificateAchievement[] = PATH_LEVELS.filter((l) => l.level < level).map((l) => ({
    level: l.level,
    name: l.name,
    emoji: l.emoji,
    goalLabel: l.goalLabel,
  }))
  return {
    masterName: masterName.trim() || 'Мастер',
    level: pl.level,
    levelName: pl.name,
    levelEmoji: pl.emoji,
    levelGoalLabel: pl.goalLabel,
    achievements,
    dateLabel,
  }
}

/* ------------------------------------------------------------------ */
/* SVG-разметка                                                        */
/* ------------------------------------------------------------------ */

/** Экранирует текст для вставки в XML/SVG (имена мастеров могут содержать &, <, >) */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Шрифт имени: длинные имена не должны вылезать за рамки сертификата */
function nameFontSize(name: string): number {
  if (name.length > 34) return 36
  if (name.length > 26) return 46
  return 58
}

/** Строка-строка одного достижения (галочка + текст) */
function achievementRow(item: CertificateAchievement, i: number): string {
  const rowY = 548 + i * 40
  const cx = 172
  const cy = rowY - 13
  return [
    `<circle cx="${cx}" cy="${cy}" r="11" fill="#8BA888"/>`,
    `<path d="M${cx - 5} ${cy} l3.5 3.5 l6.8 -7.2" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text x="196" y="${rowY}" font-size="18" fill="#2A2521">Уровень ${item.level} · «${esc(item.name)}» — ${esc(item.goalLabel)} ₽/мес</text>`,
  ].join('')
}

/** Полная SVG-разметка сертификата (строка — её же растеризуем в PNG) */
export function buildCertificateSvg(data: CertificateData): string {
  const name = esc(data.masterName)
  const font = nameFontSize(data.masterName)
  const levelName = esc(data.levelName)
  const goalLabel = esc(data.levelGoalLabel)

  const achievementsBlock =
    data.achievements.length > 0
      ? [
          `<text x="150" y="532" font-size="15" font-weight="700" letter-spacing="2.5" fill="#6B5E53">ДОСТИЖЕНИЯ</text>`,
          ...data.achievements.map(achievementRow),
        ].join('')
      : `<text x="600" y="556" text-anchor="middle" font-size="17" fill="#6B5E53">Первый уровень пройден — путь к 200к+ начат 🎉</text>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" viewBox="0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}" font-family="'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif">`,
    `<defs>`,
    `<linearGradient id="cert-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F9F8F6"/><stop offset="1" stop-color="#F2EBE6"/></linearGradient>`,
    `<linearGradient id="cert-blush" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E0C7C0"/><stop offset="1" stop-color="#D8B9B0"/></linearGradient>`,
    `</defs>`,
    /* фон */
    `<rect width="${CERTIFICATE_WIDTH}" height="${CERTIFICATE_HEIGHT}" fill="url(#cert-bg)"/>`,
    `<circle cx="1130" cy="110" r="270" fill="#E0C7C0" opacity="0.22"/>`,
    `<circle cx="60" cy="790" r="230" fill="#E0C7C0" opacity="0.16"/>`,
    /* рамки */
    `<rect x="36" y="36" width="1128" height="778" rx="30" fill="none" stroke="#6B5E53" stroke-opacity="0.28" stroke-width="2"/>`,
    `<rect x="52" y="52" width="1096" height="746" rx="22" fill="none" stroke="#E0C7C0" stroke-opacity="0.7" stroke-width="1.5"/>`,
    /* бренд */
    `<text x="600" y="128" text-anchor="middle" font-size="46" font-weight="800" letter-spacing="10" fill="#2A2521">GAZE<tspan fill="#C9A79C"> PATH</tspan></text>`,
    `<rect x="452" y="162" width="296" height="38" rx="19" fill="#6B5E53"/>`,
    `<text x="600" y="187" text-anchor="middle" font-size="15" font-weight="600" letter-spacing="3" fill="#FFFFFF" font-family="'JetBrains Mono', ui-monospace, monospace">СЕРТИФИКАТ</text>`,
    `<line x1="430" y1="236" x2="770" y2="236" stroke="#6B5E53" stroke-opacity="0.18" stroke-width="1.5"/>`,
    /* вводная */
    `<text x="600" y="272" text-anchor="middle" font-size="19" fill="#6B5E53">Настоящим подтверждается, что</text>`,
    `<text x="600" y="${330 + (58 - font)}" text-anchor="middle" font-size="${font}" font-weight="800" letter-spacing="1" fill="#2A2521">${name}</text>`,
    `<text x="600" y="382" text-anchor="middle" font-size="18" fill="#6B5E53">успешно прошла уровень GAZE PATH</text>`,
    /* карточка достигнутого уровня */
    `<rect x="330" y="408" width="540" height="100" rx="18" fill="url(#cert-blush)" opacity="0.5"/>`,
    `<rect x="330" y="408" width="540" height="100" rx="18" fill="none" stroke="#6B5E53" stroke-opacity="0.22" stroke-width="1.5"/>`,
    `<text x="600" y="456" text-anchor="middle" font-size="29" font-weight="700" fill="#2A2521">${data.levelEmoji} Уровень ${data.level} · «${levelName}»</text>`,
    `<text x="600" y="492" text-anchor="middle" font-size="15" font-weight="600" fill="#6B5E53">Цель уровня — доход ${goalLabel} ₽/мес</text>`,
    /* достижения */
    achievementsBlock,
    /* футер */
    `<line x1="150" y1="736" x2="1050" y2="736" stroke="#6B5E53" stroke-opacity="0.15" stroke-width="1.5"/>`,
    `<text x="150" y="776" font-size="14" fill="#6B5E53" opacity="0.8">GAZE · платформа роста бьюти-мастеров</text>`,
    `<text x="1050" y="776" text-anchor="end" font-size="14" fill="#6B5E53" opacity="0.8">${esc(data.dateLabel)}</text>`,
    `</svg>`,
  ].join('')
}

/* ------------------------------------------------------------------ */
/* Растеризация SVG → canvas → PNG                                     */
/* ------------------------------------------------------------------ */

/** Рисует SVG-разметку на canvas (scale 2× — PNG чёткий) и возвращает Blob */
function rasterizeSvgToPng(svgMarkup: string, width: number, height: number, scale = 2): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D недоступен')
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Не удалось собрать PNG'))
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось загрузить SVG-сертификат'))
    }
    img.src = url
  })
}

/** Скачивает Blob как файл (через невидимую ссылку) */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/** Собрать сертификат и скачать PNG (имя файла — по уровню) */
export async function downloadCertificatePng(data: CertificateData): Promise<void> {
  const blob = await rasterizeSvgToPng(buildCertificateSvg(data), CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT)
  downloadBlob(blob, `gaze-certificate-level-${data.level}.png`)
}
