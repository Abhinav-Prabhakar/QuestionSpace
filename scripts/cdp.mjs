/**
 * Tiny Chrome DevTools Protocol driver for visual checks.
 * No dependencies: Node's global WebSocket + fetch talking to headless Chrome.
 *
 *   node scripts/cdp.mjs out.png "document.querySelector('.btn').click()" 400
 *
 * Env: CDP_URL (default http://127.0.0.1:9222), PAGE_URL (default http://127.0.0.1:5173)
 */
import { writeFileSync } from 'node:fs'

const [
  ,
  ,
  out = 'shot.png',
  evalCode = 'null',
  waitMs = '700',
  widthArg = '1440',
  heightArg = '900',
  framesArg = '',
] = process.argv

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222'
const PAGE = process.env.PAGE_URL ?? 'http://127.0.0.1:5173'
const width = Number(widthArg)
const height = Number(heightArg)
const dpr = Number(process.env.DPR ?? 1)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const created = await fetch(`${CDP}/json/new?${encodeURIComponent(PAGE)}`, { method: 'PUT' }).then(
  (r) => r.json(),
)

const ws = new WebSocket(created.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

let id = 0
const pending = new Map()
const logs = []
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(JSON.stringify(msg.error)))
    else resolve(msg.result)
    return
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    logs.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push(`exception: ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`)
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    logs.push(`log: ${msg.params.entry.text}`)
  }
})

function send(method, params = {}) {
  const messageId = ++id
  return new Promise((resolve, reject) => {
    pending.set(messageId, { resolve, reject })
    ws.send(JSON.stringify({ id: messageId, method, params }))
  })
}

await send('Page.enable')
await send('Runtime.enable')
await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: dpr,
  mobile: width < 700,
})
if (process.env.REDUCED === '1') {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
}

await send('Page.navigate', { url: PAGE })
await sleep(700)

// Fresh expedition each run unless KEEP=1.
if (process.env.KEEP !== '1') {
  await send('Runtime.evaluate', { expression: 'localStorage.clear()' })
  await send('Page.reload')
  await sleep(900)
} else {
  await sleep(500)
}

const result = await send('Runtime.evaluate', {
  expression: `(async () => { ${evalCode} })()`,
  awaitPromise: true,
  returnByValue: true,
})

const frames = [Number(waitMs), ...framesArg.split(',').filter(Boolean).map(Number)]
let previous = 0
for (const [index, ms] of frames.entries()) {
  await sleep(Math.max(0, ms - previous))
  previous = ms
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: process.env.FULL === '1',
    ...(process.env.FULL === '1'
      ? {
          clip: {
            x: 0,
            y: 0,
            width: width,
            height: (
              await send('Runtime.evaluate', {
                expression: 'document.documentElement.scrollHeight',
                returnByValue: true,
              })
            ).result.value,
            scale: 1,
          },
        }
      : {}),
  })
  const target = index === 0 ? out : out.replace(/\.png$/, `-${ms}.png`)
  writeFileSync(target, Buffer.from(data, 'base64'))
  console.log(`saved ${target}`)
}

const meta = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    title: document.title,
    w: innerWidth, h: innerHeight,
    scrollH: document.documentElement.scrollHeight,
    bodyW: document.body.scrollWidth,
    focus: document.activeElement?.className || document.activeElement?.tagName,
    text: document.body.innerText.slice(0, 100000)
  })`,
  returnByValue: true,
})

console.log(`saved ${out}`)
console.log(meta.result.value)
if (result.exceptionDetails) console.log('eval error:', JSON.stringify(result.exceptionDetails))
else if (result.result?.value !== undefined) console.log('eval:', JSON.stringify(result.result.value))
if (logs.length) console.log('PAGE LOGS:\n' + logs.join('\n'))

await fetch(`${CDP}/json/close/${created.id}`)
ws.close()
process.exit(0)
