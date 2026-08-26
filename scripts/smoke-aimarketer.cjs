/* Smoke-test для локального генератора AI-маркетолога (G2).
   Транспилируем src/lib/aiMarketer.ts через esbuild и прогоняем все типы и тоны. */
const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

const src = path.resolve(__dirname, 'src/lib/aiMarketer.ts')
const out = path.resolve(__dirname, '/tmp/aiMarketer.test.js')

esbuild.buildSync({
  entryPoints: [src],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: out,
  logLevel: 'silent',
})

const { generateContent, NEURO_CHEATS, TONES } = require(out)

const types = ['post', 'stories', 'offer', 'script']
const tones = ['friendly', 'expert', 'playful']

let failures = 0
for (const t of types) {
  for (const tone of tones) {
    const variants = generateContent({ type: t, tone, service: 'маникюр', pain: 'клиенткам, которым неудобно ходить в салон' })
    if (!Array.isArray(variants) || variants.length < 3 || variants.length > 4) {
      console.error(`FAIL ${t}/${tone}: expected 3-4 variants, got ${variants?.length}`)
      failures++
      continue
    }
    for (const v of variants) {
      if (!v.label || !v.text) { console.error(`FAIL ${t}/${tone}: variant missing label/text`); failures++ }
      if (!v.text.includes('маникюр')) { console.error(`FAIL ${t}/${tone} «${v.label}»: service not substituted`); failures++ }
    }
  }
}
console.log(`generator: ${types.length * tones.length} type×tone combos, ${failures} failures`)

// Проверка 15 чит-кодов
const cats = new Set(NEURO_CHEATS.map((c) => c.category))
console.log(`cheats: ${NEURO_CHEATS.length} cards, categories: ${[...cats].join(', ')}`)
if (NEURO_CHEATS.length !== 15) { console.error('FAIL: expected exactly 15 cheats'); failures++ }

// Вывод одного примера
const sample = generateContent({ type: 'post', tone: 'friendly', service: 'маникюр', pain: 'клиенткам, которым неудобно ходить в салон' })
console.log('\n--- Пример «Классика» (пост, дружелюбный) ---\n' + sample[0].text + '\n')

process.exit(failures === 0 ? 0 : 1)
