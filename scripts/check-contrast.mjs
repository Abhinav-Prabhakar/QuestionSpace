/**
 * WCAG contrast audit for the QuestionSpace palette.
 *
 * The app deliberately mixes a dark chart with a cream paper console, so the
 * audit checks both surfaces, the sticker buttons, and the alpha-composited
 * states we actually ship (eliminated choices, tinted stamps, disabled notes).
 *
 *   node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')))

function token(name) {
  const match = root.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`missing token --${name}`)
  return match[1].trim()
}

function hex(value) {
  const raw = value.replace('#', '').trim()
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

function alpha(value) {
  if (Array.isArray(value)) return 1
  const match = value.match(/rgba?\(([^)]+)\)/)
  if (!match) return 1
  const parts = match[1].split(',').map((n) => Number(n.trim()))
  return parts.length === 4 ? parts[3] : 1
}

function rgb(value) {
  if (Array.isArray(value)) return value
  if (value.startsWith('#')) return hex(value)
  const match = value.match(/rgba?\(([^)]+)\)/)
  const [r, g, b] = match[1].split(',').map((n) => Number(n.trim()))
  return [r, g, b]
}

/** Paint rgba over an opaque background. */
function over(fg, bg) {
  const a = alpha(fg)
  const f = rgb(fg)
  const b = rgb(bg)
  return f.map((channel, i) => Math.round(channel * a + b[i] * (1 - a)))
}

function luminance(color) {
  const [r, g, b] = (Array.isArray(color) ? color : rgb(color)).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg, bg) {
  const a = luminance(Array.isArray(fg) ? fg : rgb(fg))
  const b = luminance(Array.isArray(bg) ? bg : rgb(bg))
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

const paper = token('paper')
const paper2 = token('paper-2')
const night0 = token('night-0')
const night1 = token('night-1')
const night2 = token('night-2')
const ink = token('ink')

const checks = [
  ['Paper body: ink / paper', token('ink'), paper, 4.5],
  ['Paper secondary: ink-2 / paper', token('ink-2'), paper, 4.5],
  ['Paper tertiary: ink-3 / paper', token('ink-3'), paper, 4.5],
  ['Paper tertiary: ink-3 / paper-2', token('ink-3'), paper2, 4.5],
  ['Eliminated choice: ink @ .72 / paper-2', 'rgba(27,36,55,0.72)', paper2, 4.5],
  ['Field note: ink-2 / paper', token('ink-2'), paper, 4.5],
  ['Hint text: #14566a / paper-2', '#14566a', paper2, 4.5],
  ['Good feedback: good / good-bg', token('good'), token('good-bg'), 4.5],
  ['Bad feedback: bad / bad-bg', token('bad'), token('bad-bg'), 4.5],
  ['Recovered stamp: good / mint tint', token('good'), over('rgba(99,230,195,0.22)', paper2), 4.5],
  ['Anomaly stamp: bad / coral tint', token('bad'), over('rgba(255,141,122,0.18)', paper2), 4.5],
  ['Mastered stamp: #7a4d00 / amber tint', '#7a4d00', over('rgba(255,209,102,0.28)', paper2), 4.5],
  ['Primary button: ink / amber', token('ink'), token('amber'), 4.5],
  ['Correct key: paper-2 / good', paper2, token('good'), 4.5],
  ['Wrong key: paper-2 / bad', paper2, token('bad'), 4.5],
  ['Danger button: #511a10 / #ffb4a6', '#511a10', '#ffb4a6', 4.5],
  ['Log text: chalk-2 / ink', token('chalk-2'), ink, 4.5],
  ['Log accent: mint / ink', token('mint'), ink, 4.5],
  ['Dark body: chalk / night-1', token('chalk'), night1, 4.5],
  ['Dark secondary: chalk-2 / night-1', token('chalk-2'), night1, 4.5],
  ['Dark tertiary: chalk-3 / night-1', token('chalk-3'), night1, 4.5],
  ['Dark tertiary: chalk-3 / night-2', token('chalk-3'), night2, 4.5],
  ['Brand accent: mint / night-0', token('mint'), night0, 4.5],
  ['Active node label: #fff8e9 / night-1', '#fff8e9', night1, 4.5],
  ['Region: messenger / night-1', '#9BD3E6', night1, 4.5],
  ['Region: daedalus / night-1', '#E9C188', night1, 4.5],
  ['Region: hubble / night-1', '#B4B7EA', night1, 4.5],
  ['Region: galileo / night-1', '#A8CBB6', night1, 4.5],
  ['Focus ring: ink / paper', token('ink'), paper, 3],
  ['Focus ring dark: amber / night-1', token('amber'), night1, 3],
  ['Fuel cells: ink boundary / paper-2', token('ink'), paper2, 3],
  ['Switch track: chalk-3 / night-0', token('chalk-3'), night0, 3],
  ['Anomaly marker: coral / night-1', token('coral'), night1, 3],
  ['Control edge: edge-paper on paper', over('rgba(27,36,55,0.24)', paper), paper, 1.2],
  ['Chart frame: edge-dark on night-1', over('rgba(243,236,220,0.22)', night1), night1, 1.2],
]

let failures = 0
for (const [label, fg, bg, minimum] of checks) {
  const value = ratio(over(fg, bg), bg)
  const pass = value >= minimum
  if (!pass) failures += 1
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (min ${minimum})  ${label}`,
  )
}

console.log(
  failures === 0
    ? '\nAll contrast pairs meet their target.'
    : `\n${failures} pair(s) below target.`,
)
process.exit(failures === 0 ? 0 : 1)
