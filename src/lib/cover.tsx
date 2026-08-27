/* ============================================================
   GAZE — ГЕНЕРАТОР ОБЛОЖЕК: шаблоны SVG + экспорт в PNG
   Стиль: тёплый минимализм, фирменные цвета GAZE (светлый).
   Шрифт Montserrat встраивается в SVG при экспорте, чтобы
   PNG выглядел 1-в-1 с превью (без зависимостей, клиентский).
   ============================================================ */
import type { ReactElement, Ref } from 'react'
import montserratCyr400 from '@fontsource/montserrat/files/montserrat-cyrillic-400-normal.woff2?url'
import montserratCyr500 from '@fontsource/montserrat/files/montserrat-cyrillic-500-normal.woff2?url'
import montserratCyr600 from '@fontsource/montserrat/files/montserrat-cyrillic-600-normal.woff2?url'
import montserratCyr700 from '@fontsource/montserrat/files/montserrat-cyrillic-700-normal.woff2?url'
import montserratCyrExt400 from '@fontsource/montserrat/files/montserrat-cyrillic-ext-400-normal.woff2?url'
import montserratCyrExt500 from '@fontsource/montserrat/files/montserrat-cyrillic-ext-500-normal.woff2?url'
import montserratCyrExt600 from '@fontsource/montserrat/files/montserrat-cyrillic-ext-600-normal.woff2?url'
import montserratCyrExt700 from '@fontsource/montserrat/files/montserrat-cyrillic-ext-700-normal.woff2?url'
import montserratLat400 from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff2?url'
import montserratLat500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2?url'
import montserratLat600 from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2?url'
import montserratLat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2?url'

/** Все веса Montserrat (лат + кир + кир-ext) для встраивания в экспортируемый SVG */
const FONT_ASSETS: Array<{ weight: number; urls: string[] }> = [
  { weight: 400, urls: [montserratLat400, montserratCyr400, montserratCyrExt400] },
  { weight: 500, urls: [montserratLat500, montserratCyr500, montserratCyrExt500] },
  { weight: 600, urls: [montserratLat600, montserratCyr600, montserratCyrExt600] },
  { weight: 700, urls: [montserratLat700, montserratCyr700, montserratCyrExt700] },
]

/* ---------- Фирменные цвета GAZE (светлый стиль) ---------- */

export const CREAM = '#F9F8F6'
export const BLUSH = '#E0C7C0'
export const WARM = '#6B5E53' // акцент
export const INK = '#2A2521' // основной текст
export const WHITE = '#FFFFFF'

/* ---------- Типы ---------- */

export type CoverFormatId = 'stories' | 'post'
export type CoverTemplateId = 'minimal' | 'blush' | 'frame'

export interface CoverTexts {
  title: string
  subtitle: string
  name: string
}

export interface CoverFormat {
  id: CoverFormatId
  label: string
  /** Соотношение сторон, например «9:16» */
  short: string
  width: number
  height: number
}

export const COVER_FORMATS: CoverFormat[] = [
  { id: 'stories', label: 'Сторис', short: '9:16', width: 1080, height: 1920 },
  { id: 'post', label: 'Пост', short: '4:5', width: 1080, height: 1350 },
]

/** Фолбэки для пустых полей, чтобы превью никогда не было пустым */
export const COVER_FALLBACKS: CoverTexts = {
  title: 'Ваш заголовок',
  subtitle: 'Подзаголовок',
  name: 'Ваше имя',
}

export function resolveCoverTexts(texts: CoverTexts): CoverTexts {
  return {
    title: texts.title.trim() || COVER_FALLBACKS.title,
    subtitle: texts.subtitle.trim() || COVER_FALLBACKS.subtitle,
    name: texts.name.trim() || COVER_FALLBACKS.name,
  }
}

/* ---------- Измерение текста (для переноса строк) ---------- */

let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!measureCtx) {
    const canvas = document.createElement('canvas')
    measureCtx = canvas.getContext('2d')
  }
  return measureCtx
}

export function fontFor(size: number, weight: number): string {
  return `${weight} ${size}px 'Montserrat', sans-serif`
}

/** Ширина строки в px при заданном кегле/весе (Montserrat загружен на странице) */
export function measureWidth(text: string, size: number, weight: number): number {
  const ctx = getMeasureCtx()
  if (ctx) {
    ctx.font = fontFor(size, weight)
    return ctx.measureText(text).width
  }
  // Фолбэк без canvas: грубая оценка по пропорциональному шрифту
  return text.length * size * 0.62
}

/** Жадный перенос по словам: возвращает строки, помещающиеся в maxWidth */
export function wrapText(text: string, size: number, weight: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && measureWidth(candidate, size, weight) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

/* ---------- Вспомогательный рендер многострочного текста ---------- */

function Lines({
  lines,
  x,
  y,
  size,
  weight,
  fill,
  anchor = 'middle',
}: {
  lines: string[]
  x: number
  y: number
  size: number
  weight: number
  fill: string
  anchor?: 'middle' | 'start' | 'end'
}) {
  const lh = size * 1.28
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + i * lh}
          textAnchor={anchor}
          fontSize={size}
          fontWeight={weight}
          fontFamily="'Montserrat', sans-serif"
          fill={fill}
        >
          {line}
        </text>
      ))}
    </>
  )
}

/** Первый baseline строки — визуально по центру блока текста */
function firstBaseline(size: number): number {
  return size * 0.82
}

/* ---------- Размеры типографики по формату ---------- */

function sizesFor(formatId: CoverFormatId) {
  return formatId === 'stories'
    ? { title: 76, subtitle: 34, name: 30, kicker: 20, padX: 120 }
    : { title: 62, subtitle: 30, name: 27, kicker: 18, padX: 96 }
}

/* ------------------------------------------------------------------ */
/* ШАБЛОН 1 — «Минимализм»: кремовый, блаш-кольца, акцентный текст     */
/* ------------------------------------------------------------------ */

function renderMinimal(
  format: CoverFormat,
  texts: CoverTexts,
  svgRef?: Ref<SVGSVGElement>,
): ReactElement {
  const { width: W, height: H } = format
  const s = sizesFor(format.id)
  const resolved = resolveCoverTexts(texts)

  const titleLines = wrapText(resolved.title, s.title, 700, W - s.padX * 2)
  const subtitleLines = wrapText(resolved.subtitle, s.subtitle, 500, W - s.padX * 2)

  const titleLH = s.title * 1.28
  const subLH = s.subtitle * 1.28
  const titleH = titleLines.length * titleLH
  const subH = subtitleLines.length * subLH
  const blockH = titleH + 26 + subH
  const topY = (H - blockH) / 2
  const titleY = topY + firstBaseline(s.title)
  const subY = topY + titleH + 26 + firstBaseline(s.subtitle)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={W} height={H} fill={CREAM} />

      {/* Декоративные блаш-кольца */}
      <circle cx={W - 150} cy={150} r={92} fill="none" stroke={BLUSH} strokeWidth={2} />
      <circle cx={W - 150} cy={150} r={148} fill="none" stroke={BLUSH} strokeWidth={1} opacity={0.55} />
      <circle cx={130} cy={H - 170} r={46} fill={BLUSH} opacity={0.6} />

      {/* Кейкер */}
      <text
        x={W / 2}
        y={150}
        textAnchor="middle"
        fontSize={s.kicker}
        fontWeight={700}
        fontFamily="'Montserrat', sans-serif"
        letterSpacing={4}
        fill={WARM}
      >
        GAZE · BEAUTY
      </text>

      {/* Заголовок */}
      <Lines lines={titleLines} x={W / 2} y={titleY} size={s.title} weight={700} fill={WARM} />

      {/* Подзаголовок */}
      <Lines lines={subtitleLines} x={W / 2} y={subY} size={s.subtitle} weight={500} fill={INK} />

      {/* Имя + блаш-линия внизу */}
      <rect x={W / 2 - 26} y={H - 170} width={52} height={3} rx={1.5} fill={BLUSH} />
      <text
        x={W / 2}
        y={H - 120}
        textAnchor="middle"
        fontSize={s.name}
        fontWeight={600}
        fontFamily="'Montserrat', sans-serif"
        fill={INK}
      >
        {resolved.name}
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* ШАБЛОН 2 — «Блаш-градиент»: тёплый фон, светлые круги, имя в пилюле */
/* ------------------------------------------------------------------ */

function renderBlush(
  format: CoverFormat,
  texts: CoverTexts,
  svgRef?: Ref<SVGSVGElement>,
): ReactElement {
  const { width: W, height: H } = format
  const s = sizesFor(format.id)
  const resolved = resolveCoverTexts(texts)

  const titleLines = wrapText(resolved.title, s.title, 700, W - s.padX * 2)
  const subtitleLines = wrapText(resolved.subtitle, s.subtitle, 500, W - s.padX * 2)

  const titleLH = s.title * 1.28
  const subLH = s.subtitle * 1.28
  const titleH = titleLines.length * titleLH
  const subH = subtitleLines.length * subLH
  const blockH = titleH + 26 + subH
  const topY = (H - blockH) / 2
  const titleY = topY + firstBaseline(s.title)
  const subY = topY + titleH + 26 + firstBaseline(s.subtitle)

  // Имя — ширина пилюли по измеренному тексту
  const nameW = measureWidth(resolved.name, s.name, 600)
  const pillW = nameW + 96

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gaze-blush-bg" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#F2E4DE" />
          <stop offset="55%" stopColor={BLUSH} />
          <stop offset="100%" stopColor="#D3B3A9" />
        </linearGradient>
        <radialGradient id="gaze-blush-glow" cx="0.5" cy="0.22" r="0.75">
          <stop offset="0%" stopColor={WHITE} stopOpacity="0.85" />
          <stop offset="100%" stopColor={WHITE} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill="url(#gaze-blush-bg)" />
      <circle cx={W * 0.13} cy={H * 0.1} r={170} fill={WHITE} opacity={0.3} />
      <circle cx={W * 0.92} cy={H * 0.86} r={250} fill="#C9A79E" opacity={0.4} />
      <rect width={W} height={H} fill="url(#gaze-blush-glow)" />

      {/* Кейкер */}
      <text
        x={W / 2}
        y={150}
        textAnchor="middle"
        fontSize={s.kicker}
        fontWeight={700}
        fontFamily="'Montserrat', sans-serif"
        letterSpacing={4}
        fill={INK}
        opacity={0.75}
      >
        GAZE · BEAUTY
      </text>

      {/* Заголовок — тёмный на тёплом фоне */}
      <Lines lines={titleLines} x={W / 2} y={titleY} size={s.title} weight={700} fill={INK} />

      {/* Подзаголовок — глубокий тёплый тон */}
      <Lines lines={subtitleLines} x={W / 2} y={subY} size={s.subtitle} weight={500} fill="#7A554B" />

      {/* Имя в кремовой пилюле */}
      <rect
        x={W / 2 - pillW / 2}
        y={H - 170}
        width={pillW}
        height={s.name + 46}
        rx={(s.name + 46) / 2}
        fill={CREAM}
      />
      <text
        x={W / 2}
        y={H - 126}
        textAnchor="middle"
        fontSize={s.name}
        fontWeight={600}
        fontFamily="'Montserrat', sans-serif"
        fill={WARM}
      >
        {resolved.name}
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* ШАБЛОН 3 — «С рамкой»: двойная блаш-рамка, акцент по центру          */
/* ------------------------------------------------------------------ */

function renderFrame(
  format: CoverFormat,
  texts: CoverTexts,
  svgRef?: Ref<SVGSVGElement>,
): ReactElement {
  const { width: W, height: H } = format
  const s = sizesFor(format.id)
  const resolved = resolveCoverTexts(texts)

  const titleLines = wrapText(resolved.title, s.title, 700, W - s.padX * 2 - 90)
  const subtitleLines = wrapText(resolved.subtitle, s.subtitle, 500, W - s.padX * 2 - 90)

  const titleLH = s.title * 1.28
  const subLH = s.subtitle * 1.28
  const titleH = titleLines.length * titleLH
  const subH = subtitleLines.length * subLH
  const blockH = titleH + 26 + subH
  const topY = (H - blockH) / 2
  const titleY = topY + firstBaseline(s.title)
  const subY = topY + titleH + 26 + firstBaseline(s.subtitle)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={W} height={H} fill={CREAM} />

      {/* Двойная блаш-рамка */}
      <rect
        x={56}
        y={56}
        width={W - 112}
        height={H - 112}
        rx={42}
        fill="none"
        stroke={BLUSH}
        strokeWidth={2}
      />
      <rect
        x={76}
        y={76}
        width={W - 152}
        height={H - 152}
        rx={30}
        fill="none"
        stroke={BLUSH}
        strokeWidth={1}
        opacity={0.55}
      />

      {/* Угловые точки */}
      <circle cx={92} cy={92} r={7} fill={WARM} />
      <circle cx={W - 92} cy={92} r={7} fill={WARM} />
      <circle cx={92} cy={H - 92} r={7} fill={WARM} />
      <circle cx={W - 92} cy={H - 92} r={7} fill={WARM} />

      {/* Кейкер */}
      <text
        x={W / 2}
        y={170}
        textAnchor="middle"
        fontSize={s.kicker}
        fontWeight={700}
        fontFamily="'Montserrat', sans-serif"
        letterSpacing={4}
        fill={WARM}
      >
        GAZE
      </text>

      {/* Заголовок */}
      <Lines lines={titleLines} x={W / 2} y={titleY} size={s.title} weight={700} fill={WARM} />

      {/* Подзаголовок */}
      <Lines lines={subtitleLines} x={W / 2} y={subY} size={s.subtitle} weight={500} fill={INK} />

      {/* Имя внизу */}
      <text
        x={W / 2}
        y={H - 140}
        textAnchor="middle"
        fontSize={s.name}
        fontWeight={600}
        fontFamily="'Montserrat', sans-serif"
        fill={INK}
      >
        {resolved.name}
      </text>
      <rect x={W / 2 - 22} y={H - 112} width={44} height={3} rx={1.5} fill={BLUSH} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Реестр шаблонов                                                     */
/* ------------------------------------------------------------------ */

export interface CoverTemplate {
  id: CoverTemplateId
  label: string
  hint: string
  renderCover: (
    format: CoverFormat,
    texts: CoverTexts,
    svgRef?: Ref<SVGSVGElement>,
  ) => ReactElement
}

export const COVER_TEMPLATES: CoverTemplate[] = [
  {
    id: 'minimal',
    label: 'Минимализм',
    hint: 'Кремовый фон, блаш-кольца',
    renderCover: renderMinimal,
  },
  {
    id: 'blush',
    label: 'Блаш-градиент',
    hint: 'Тёплый градиент, имя в пилюле',
    renderCover: renderBlush,
  },
  {
    id: 'frame',
    label: 'С рамкой',
    hint: 'Двойная рамка, точки по углам',
    renderCover: renderFrame,
  },
]

/* ------------------------------------------------------------------ */
/* Экспорт: SVG → PNG (шрифты встраиваются в SVG как data-URI)          */
/* ------------------------------------------------------------------ */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

/** Собрать @font-face для Montserrat (все веса и подмножества) */
async function buildFontFaces(): Promise<string> {
  const rules: string[] = []
  for (const asset of FONT_ASSETS) {
    const srcs = (
      await Promise.all(asset.urls.map((u) => fetchAsDataUrl(u)))
    ).filter((u): u is string => Boolean(u))
    for (const src of srcs) {
      rules.push(
        `@font-face{font-family:'Montserrat';font-style:normal;font-weight:${asset.weight};src:url(${src}) format('woff2');}`,
      )
    }
  }
  return rules.join('')
}

/** Скачать обложку (SVG-элемент) как PNG указанного размера */
export async function exportCoverPng(
  svgElement: SVGSVGElement,
  width: number,
  height: number,
  filename: string,
): Promise<void> {
  const fontFaces = await buildFontFaces()

  // Клонируем, чтобы не трогать живое дерево
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  styleEl.textContent = fontFaces
  clone.insertBefore(styleEl, clone.firstChild)

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Не удалось загрузить SVG'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas недоступен')
    ctx.drawImage(img, 0, 0, width, height)

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (!pngBlob) throw new Error('Не удалось создать PNG')

    const downloadUrl = URL.createObjectURL(pngBlob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000)
  } finally {
    URL.revokeObjectURL(url)
  }
}
