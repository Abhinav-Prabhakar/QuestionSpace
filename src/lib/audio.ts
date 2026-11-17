/**
 * QuestionSpace sound design — synthesised, not sampled.
 *
 * A low ship hum, occasional radio chatter, and tiny confirmation pings.
 * Everything starts from a user gesture (the launch button / sound switch),
 * so browser autoplay rules are respected. No audio files, no network.
 */

export type Sfx =
  | 'click'
  | 'select'
  | 'correct'
  | 'discovery'
  | 'scan'
  | 'launch'
  | 'land'
  | 'crew'
  | 'route'
  | 'fuel'
  | 'log'

type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let ambient: GainNode | null = null
let ambientNodes: AudioScheduledSourceNode[] = []
let chatterTimer: number | null = null
let chatterAlive = false
let enabled = false
let ambientOn = false

function AudioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null
}

function ensureContext(): Ctx | null {
  if (ctx) return ctx
  const Ctor = AudioCtor()
  if (!Ctor) return null
  ctx = new Ctor()
  master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(ctx.destination)
  return ctx
}

export function isAudioEnabled() {
  return enabled
}

/** Call from a click / key gesture. */
export function enableAudio() {
  enabled = true
  const audio = ensureContext()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
  startAmbient()
}

export function disableAudio() {
  enabled = false
  stopAmbient()
}

export function startAmbient() {
  if (!enabled || ambientOn) return
  const audio = ensureContext()
  if (!audio || !master) return
  ambientOn = true

  ambient = audio.createGain()
  ambient.gain.value = 0
  ambient.gain.linearRampToValueAtTime(0.22, audio.currentTime + 2.2)
  ambient.connect(master)

  const lowpass = audio.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 260
  lowpass.Q.value = 0.7

  const humA = audio.createOscillator()
  humA.type = 'sine'
  humA.frequency.value = 54
  const humB = audio.createOscillator()
  humB.type = 'triangle'
  humB.frequency.value = 81.5
  humB.detune.value = 4

  const humGain = audio.createGain()
  humGain.gain.value = 0.22
  humA.connect(humGain)
  humB.connect(humGain)
  humGain.connect(lowpass)
  lowpass.connect(ambient)

  const lfo = audio.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.09
  const lfoGain = audio.createGain()
  lfoGain.gain.value = 30
  lfo.connect(lfoGain)
  lfoGain.connect(lowpass.frequency)

  humA.start()
  humB.start()
  lfo.start()
  ambientNodes = [humA, humB, lfo]

  // A whisper of solar wind.
  const wind = audio.createBufferSource()
  wind.buffer = noiseBuffer(audio, 4)
  wind.loop = true
  const windFilter = audio.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 520
  windFilter.Q.value = 0.7
  const windGain = audio.createGain()
  windGain.gain.value = 0.045
  wind.connect(windFilter)
  windFilter.connect(windGain)
  windGain.connect(ambient)
  wind.start()
  ambientNodes.push(wind)

  scheduleChatter()
}

export function stopAmbient() {
  chatterAlive = false
  if (chatterTimer !== null) {
    window.clearTimeout(chatterTimer)
    chatterTimer = null
  }
  if (ambient && ctx) {
    const now = ctx.currentTime
    ambient.gain.cancelScheduledValues(now)
    ambient.gain.setValueAtTime(ambient.gain.value, now)
    ambient.gain.linearRampToValueAtTime(0, now + 0.6)
  }
  const nodes = ambientNodes
  ambientNodes = []
  window.setTimeout(() => {
    for (const node of nodes) {
      try {
        node.stop()
      } catch {
        /* already stopped */
      }
    }
  }, 700)
  ambient = null
  ambientOn = false
}

function noiseBuffer(audio: Ctx, seconds = 1): AudioBuffer {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds))
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function noise(audio: Ctx, gainValue: number, duration: number): AudioBufferSourceNode {
  const source = audio.createBufferSource()
  source.buffer = noiseBuffer(audio, duration)
  const gain = audio.createGain()
  gain.gain.value = gainValue
  source.connect(gain)
  gain.connect(master ?? audio.destination)
  source.start()
  source.stop(audio.currentTime + duration)
  return source
}

function blip(
  audio: Ctx,
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  when = 0,
  slideTo?: number,
) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const now = audio.currentTime + when
  osc.type = type
  osc.frequency.setValueAtTime(frequency, now)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(master ?? audio.destination)
  osc.start(now)
  osc.stop(now + duration + 0.03)
}

export function playSfx(name: Sfx) {
  if (!enabled) return
  const audio = ensureContext()
  if (!audio) return
  if (audio.state === 'suspended') void audio.resume()
  const t = audio.currentTime

  switch (name) {
    case 'click':
      blip(audio, 210, 0.05, 'square', 0.05)
      break
    case 'select':
      blip(audio, 420, 0.09, 'triangle', 0.1, 0, 680)
      break
    case 'correct':
      blip(audio, 523.25, 0.16, 'sine', 0.16)
      blip(audio, 783.99, 0.24, 'sine', 0.12, 0.08)
      break
    case 'discovery':
      blip(audio, 392, 0.28, 'sine', 0.14, 0, 261)
      blip(audio, 660, 0.18, 'triangle', 0.07, 0.09, 520)
      break
    case 'scan':
      blip(audio, 220, 0.32, 'triangle', 0.1, 0, 880)
      noise(audio, 0.018, 0.08)
      break
    case 'launch':
      blip(audio, 70, 0.6, 'sawtooth', 0.06, 0, 34)
      noise(audio, 0.045, 0.5)
      break
    case 'land':
      blip(audio, 90, 0.22, 'sine', 0.22, 0, 48)
      noise(audio, 0.03, 0.1)
      break
    case 'crew':
      blip(audio, 523, 0.12, 'triangle', 0.12)
      blip(audio, 659, 0.12, 'triangle', 0.11, 0.09)
      blip(audio, 880, 0.22, 'triangle', 0.1, 0.18)
      break
    case 'route':
      blip(audio, 330, 0.18, 'square', 0.06)
      blip(audio, 495, 0.22, 'square', 0.05, 0.1)
      break
    case 'fuel':
      blip(audio, 880, 0.08, 'sine', 0.12)
      blip(audio, 1174, 0.12, 'sine', 0.08, 0.06)
      break
    case 'log':
      blip(audio, 1100, 0.04, 'square', 0.03)
      blip(audio, 900, 0.05, 'square', 0.025, 0.08)
      break
    default:
      void t
  }
}

function scheduleChatter() {
  chatterAlive = true
  const next = () => {
    if (!chatterAlive) return
    const delay = 14000 + Math.random() * 22000
    chatterTimer = window.setTimeout(() => {
      if (!enabled || !ctx || !ambient) return
      radioBurst()
      next()
    }, delay)
  }
  next()
}

function radioBurst() {
  if (!ctx || !ambient) return
  const audio = ctx
  const duration = 0.35 + Math.random() * 0.6
  const source = audio.createBufferSource()
  source.buffer = noiseBuffer(audio, duration)
  const band = audio.createBiquadFilter()
  band.type = 'bandpass'
  band.frequency.value = 900 + Math.random() * 900
  band.Q.value = 5
  const gain = audio.createGain()
  const now = audio.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.03, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  source.connect(band)
  band.connect(gain)
  gain.connect(ambient)
  source.start(now)
  source.stop(now + duration)
  if (Math.random() > 0.45) {
    blip(audio, 1200 + Math.random() * 500, 0.06, 'square', 0.018, duration * 0.5)
  }
}
