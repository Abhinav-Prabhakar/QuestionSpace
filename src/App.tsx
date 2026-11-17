import { useEffect, useReducer, useRef, useState } from 'react'
import {
  EXPEDITION,
  STATION,
  getQuestion,
  getTopic,
  type ChoiceId,
  type CrewId,
  type RouteKind,
} from './data/expedition'
import {
  activePassFor,
  activeQuestionId,
  dueAnomalyIds,
  loadState,
  reducer,
  saveState,
} from './lib/session'
import { useMotionOverride, useSystemReducedMotion } from './lib/motion'
import { disableAudio, enableAudio, isAudioEnabled, playSfx } from './lib/audio'
import { StarMap, type Flight } from './components/StarMap'
import { Console } from './components/Console'
import { Briefing } from './components/Briefing'
import { Debrief } from './components/Debrief'
import { Branch } from './components/Branch'
import { TopBar } from './components/TopBar'

const SOUND_KEY = 'questionspace.sound.v1'

function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const systemReduced = useSystemReducedMotion()
  const [override, setOverride] = useMotionOverride()
  const reduced = override ?? systemReduced
  const motion = !reduced

  const [sound, setSound] = useState(loadSound)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [landing, setLanding] = useState(false)
  const [landingKey, setLandingKey] = useState(0)
  const [focusSignal, setFocusSignal] = useState(0)
  const flightTimer = useRef<number | undefined>(undefined)
  const landTimer = useRef<number | undefined>(undefined)
  const lastGainKey = useRef('')

  const activeId = activeQuestionId(state)
  const active = getQuestion(activeId)
  const topic = getTopic(active.topicId)
  const record = state.answers[active.id]
  const pass = activePassFor(state)
  const answered = record?.pass === pass
  const skipped = !answered && state.skips[active.id]?.pass === pass
  const retrying = state.openRetry === active.id
  const due = dueAnomalyIds(state)
  const dueId = due[0]

  useEffect(() => saveState(state), [state])

  /* Persist sound, and start the ambience on the next gesture if it is on. */
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, sound ? 'on' : 'off')
    } catch {
      /* ignore */
    }
    if (!sound) disableAudio()
  }, [sound])

  useEffect(() => {
    if (!sound) return
    const wake = () => {
      if (!isAudioEnabled()) enableAudio()
    }
    window.addEventListener('pointerdown', wake, { once: true })
    window.addEventListener('keydown', wake, { once: true })
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [sound])

  /* Launch is a map event: the next question is readable immediately,
     while the ship arcs to its node alongside it. */
  useEffect(() => {
    window.clearTimeout(flightTimer.current)
    if (state.phase !== 'underway' || reduced) {
      setFlight(null)
      return
    }
    const to = getQuestion(activeQuestionId(state)).map
    const currentMain = state.itinerary[state.cursor]
    const from = state.detour
      ? getQuestion(currentMain ?? activeId).map
      : state.cursor > 0
        ? getQuestion(state.itinerary[state.cursor - 1]).map
        : STATION
    setFlight({ from, to, key: Date.now() })
    flightTimer.current = window.setTimeout(() => setFlight(null), 980)
    return () => window.clearTimeout(flightTimer.current)
  }, [state.phase, state.cursor, state.detour?.id, state.itinerary, reduced, activeId])

  useEffect(() => () => window.clearTimeout(landTimer.current), [])

  /* A small sound when a gain lands, so rewards register. */
  const gainKey = `${state.lastGain.fuel}-${state.lastGain.crew ?? ''}-${activeId}-${record?.at ?? 0}`
  useEffect(() => {
    if (!sound || gainKey === lastGainKey.current) return
    lastGainKey.current = gainKey
    if (state.lastGain.fuel > 0 || state.lastGain.crew) playSfx('fuel')
  }, [gainKey, sound, state.lastGain.fuel, state.lastGain.crew])

  const handleAnswer = (choiceId: ChoiceId) => {
    if (answered || skipped) return
    const correct = choiceId === active.correctChoiceId
    dispatch({ type: 'answer', questionId: active.id, choiceId, at: Date.now() })
    if (sound) playSfx(correct ? 'correct' : 'discovery')
  }

  const handleScan = () => {
    if (answered || skipped || state.fuel < active.hintCost) return
    dispatch({ type: 'scan', questionId: active.id })
    if (sound) playSfx('scan')
  }

  const handleSkip = () => {
    if (answered || skipped || state.fuel < EXPEDITION.skipCost) return
    dispatch({ type: 'skip', questionId: active.id, at: Date.now() })
    if (sound) playSfx('click')
  }

  const handleRetry = () => {
    if (!answered || record?.correct) return
    if (state.fuel < EXPEDITION.retryCost) return
    dispatch({ type: 'retry', questionId: active.id })
    if (sound) playSfx('click')
  }

  const handleCrew = (crewId: CrewId) => {
    dispatch({ type: 'use-crew', crewId, questionId: active.id, at: Date.now() })
    if (sound) playSfx(crewId === 'bolt' ? 'fuel' : 'crew')
  }

  const handleTrack = (questionId: string) => {
    dispatch({ type: 'track-anomaly', questionId })
    setFocusSignal((signal) => signal + 1)
    if (sound) playSfx('route')
  }

  const handleRoute = (route: RouteKind) => {
    dispatch({ type: 'choose-route', route })
    setFocusSignal((signal) => signal + 1)
    if (sound) playSfx('route')
  }

  const handleLand = () => {
    if (landing) return
    setLanding(true)
    setLandingKey((key) => key + 1)
    if (sound) playSfx('land')
    landTimer.current = window.setTimeout(
      () => {
        dispatch({ type: 'land' })
        setLanding(false)
        setFocusSignal((signal) => signal + 1)
      },
      reduced ? 80 : 380,
    )
  }

  const handleBegin = () => {
    if (sound) {
      enableAudio()
      playSfx('launch')
    }
    dispatch({ type: 'begin', at: Date.now() })
    setFocusSignal((signal) => signal + 1)
  }

  const handleRevisit = () => {
    if (sound) playSfx('launch')
    dispatch({ type: 'revisit' })
    setFocusSignal((signal) => signal + 1)
  }

  const handleReset = () => {
    dispatch({ type: 'reset' })
  }

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    if (next) {
      enableAudio()
      playSfx('select')
    } else {
      disableAudio()
    }
  }

  /* Keyboard-first play. Buttons keep their native Enter/Space handling. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const onButton = Boolean(target?.closest('button'))

      if (state.phase === 'junction') {
        if (event.key === '1') {
          event.preventDefault()
          handleRoute('safe')
        } else if (event.key === '2') {
          event.preventDefault()
          handleRoute('risky')
        }
        return
      }

      if (state.phase !== 'underway') return
      const key = event.key.toLowerCase()

      if (!answered && !skipped) {
        const digits = ['1', '2', '3', '4']
        const letters = ['a', 'b', 'c', 'd']
        const index = digits.includes(key) ? digits.indexOf(key) : letters.indexOf(key)
        if (index >= 0 && index < active.choices.length) {
          event.preventDefault()
          handleAnswer(active.choices[index].id)
          return
        }
        if (key === 'h') {
          event.preventDefault()
          handleScan()
          return
        }
        if (key === 's') {
          event.preventDefault()
          handleSkip()
          return
        }
        if (key === 't' && dueId) {
          event.preventDefault()
          handleTrack(dueId)
        }
        return
      }

      if (!answered && skipped) {
        if ((event.key === 'Enter' || event.key === ' ') && !onButton) {
          event.preventDefault()
          handleLand()
        }
        return
      }

      if (record && !record.correct && !retrying && key === 'r') {
        event.preventDefault()
        handleRetry()
        return
      }

      if ((event.key === 'Enter' || event.key === ' ') && !onButton) {
        event.preventDefault()
        handleLand()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const statusMessage =
    state.phase === 'junction'
      ? 'The route forks. Press 1 for the calm lane, 2 for the storm lane.'
      : state.phase === 'underway'
        ? answered
          ? retrying
            ? 'Retry window open. Choose another answer.'
            : record.correct
            ? `Signal confirmed at ${active.destination}.${
                state.lastGain.fuel > 0 ? ` Fuel plus ${state.lastGain.fuel}.` : ''
              }${state.lastGain.crew ? ` ${state.lastGain.crew.toUpperCase()} joined the crew.` : ''} ${
                active.explanation
              }`
            : `Sample logged at ${active.destination}. It remains on the chart as an anomaly. The correct reading is ${
                active.choices.find((choice) => choice.id === active.correctChoiceId)?.label
              }. ${active.explanation}`
          : skipped
            ? `${active.destination} left behind as an anomaly. It will resurface later.`
            : state.hints.includes(active.id)
              ? `Scan complete. ${active.hint}`
              : dueId
                ? `Anomaly due now: ${getQuestion(dueId).destination}. Press T to track it.`
                : ''
        : ''

  return (
    <div className={`app ${motion ? '' : 'motion-off'} ${sound ? '' : 'sound-off'}`}>
      <a className="skip-link" href="#console-slot">
        Skip to the console
      </a>

      <TopBar
        sound={sound}
        motion={motion}
        onToggleSound={toggleSound}
        onToggleMotion={() => setOverride(motion)}
      />

      <main className="stage">
        <StarMap
          state={state}
          flight={flight}
          landingKey={landingKey}
          motion={motion}
          landing={landing}
          onTrackAnomaly={handleTrack}
        />

        <div className="console-slot" id="console-slot">
          {state.phase === 'preflight' ? (
            <Briefing state={state} onBegin={handleBegin} />
          ) : state.phase === 'junction' ? (
            <Branch state={state} onChoose={handleRoute} />
          ) : state.phase === 'debrief' ? (
            <Debrief state={state} onRevisit={handleRevisit} onReset={handleReset} />
          ) : (
            <Console
              question={active}
              topic={topic}
              index={state.cursor}
              total={state.itinerary.length}
              state={state}
              onAnswer={handleAnswer}
              onScan={handleScan}
              onRetry={handleRetry}
              onSkip={handleSkip}
              onLand={handleLand}
              onTrackAnomaly={handleTrack}
              onUseCrew={handleCrew}
              landing={landing}
              focusSignal={focusSignal}
            />
          )}
        </div>
      </main>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>

      <p className="sr-only">
        Expedition 001, {EXPEDITION.title}. Fuel is a spendable hint currency and never a life
        total. Keys: 1 to 4 answer, H scans, S skips, R retries, T tracks an anomaly, Enter flies
        on.
      </p>
    </div>
  )
}
