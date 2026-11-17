import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import {
  CREW,
  DIFFICULTY_LABEL,
  EXPEDITION,
  ROUTES,
  getQuestion,
  topicQuestions,
  type Choice,
  type CrewId,
  type Question,
  type Topic,
} from '../data/expedition'
import {
  activePassFor,
  dueAnomalyIds,
  expeditionProgress,
  regionStats,
  statusOf,
  type ExpeditionState,
} from '../lib/session'
import { FuelGauge } from './FuelGauge'
import { CrewDock } from './CrewDock'
import {
  AnomalyIcon,
  CheckIcon,
  RetryIcon,
  ScanIcon,
  SkipIcon,
} from './Icons'

interface ConsoleProps {
  question: Question
  topic: Topic
  index: number
  total: number
  state: ExpeditionState
  onAnswer: (choiceId: Choice['id']) => void
  onScan: () => void
  onRetry: () => void
  onSkip: () => void
  onLand: () => void
  onTrackAnomaly: (id: string) => void
  onUseCrew: (id: CrewId) => void
  landing: boolean
  focusSignal: number
}

function choiceStateClass(
  choice: Choice,
  showFeedback: boolean,
  selected: string | undefined,
  correctId: string,
  eliminated: string[],
): string {
  if (eliminated.includes(choice.id)) return 'is-eliminated'
  if (!showFeedback) return ''
  if (choice.id === correctId) return 'is-correct'
  if (choice.id === selected) return 'is-wrong'
  return 'is-inert'
}

export function Console({
  question,
  topic,
  index,
  total,
  state,
  onAnswer,
  onScan,
  onRetry,
  onSkip,
  onLand,
  onTrackAnomaly,
  onUseCrew,
  landing,
  focusSignal,
}: ConsoleProps) {
  const record = state.answers[question.id]
  const pass = activePassFor(state)
  const answered = record?.pass === pass
  const skipped = !answered && state.skips[question.id]?.pass === pass
  const retrying = state.openRetry === question.id
  const showFeedback = answered && !retrying
  const correct = showFeedback && Boolean(record?.correct)
  const eliminated = state.eliminated[question.id] ?? []
  const hintVisible = state.hints.includes(question.id)
  const scanCost = question.hintCost
  const canScan = !answered && !skipped && !hintVisible && state.fuel >= scanCost
  const canSkip = !answered && !skipped && state.fuel >= EXPEDITION.skipCost
  const canRetry =
    showFeedback && !correct && state.fuel >= EXPEDITION.retryCost && !retrying
  const correctChoice = question.choices.find((choice) => choice.id === question.correctChoiceId)
  const status = statusOf(state, question.id)
  const route = state.route[question.id]
  const routeMeta = route ? ROUTES[route] : null
  const regionNodes = topicQuestions(topic.id)
  const region = regionStats(
    state,
    regionNodes.map((node) => node.id),
  )
  const due = dueAnomalyIds(state)
  const dueId = due[0]
  const dueQuestion = dueId ? getQuestion(dueId) : null
  const progress = expeditionProgress(state)
  const promptRef = useRef<HTMLHeadingElement>(null)
  const landRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef(-1)

  useEffect(() => {
    if (lastFocus.current !== focusSignal) {
      lastFocus.current = focusSignal
      promptRef.current?.focus({ preventScroll: true })
    }
  }, [focusSignal])

  useEffect(() => {
    if (showFeedback || skipped) landRef.current?.focus({ preventScroll: true })
    else if (retrying) retryRef.current?.focus({ preventScroll: true })
  }, [showFeedback, retrying, skipped])

  const gain = state.lastGain

  return (
    <section className={`console ${retrying ? 'is-retrying' : ''}`} aria-labelledby="question-heading">
      <header className="console-meta">
        <p className="node-index">
          {state.detour ? (
            <>
              Anomaly<span> / detour</span>
            </>
          ) : (
            <>
              World {String(index + 1).padStart(2, '0')}
              <span> / {String(total).padStart(2, '0')}</span>
            </>
          )}
        </p>
        <div className="meta-right">
          <FuelGauge fuel={state.fuel} max={EXPEDITION.maxFuel} />
          <p className="console-region">
            <span
              className="region-dot"
              style={{ '--dot-color': topic.hue } as CSSProperties}
              aria-hidden="true"
            />
            {topic.discipline}
          </p>
        </div>
      </header>

      <div className="console-body">
        <div className="question-block">
          <p className="kicker">
            <span className="kicker-dest">{question.destination}</span>
            <span className="kicker-sep" aria-hidden="true">
              /
            </span>
            {question.tag} · {DIFFICULTY_LABEL[question.difficulty]}
            {routeMeta ? (
              <span className={`route-badge is-${route}`}>{route === 'safe' ? 'Quiet lane' : 'Storm lane'}</span>
            ) : null}
          </p>

          <h2 className="prompt" id="question-heading" ref={promptRef} tabIndex={-1}>
            {question.prompt}
          </h2>

          <ol className="choices" aria-label="Answer choices">
            {question.choices.map((choice, i) => {
              const cls = choiceStateClass(
                choice,
                showFeedback,
                record?.choiceId,
                question.correctChoiceId,
                eliminated,
              )
              const isCorrect = cls === 'is-correct'
              const isWrong = cls === 'is-wrong'
              const isOut = cls === 'is-eliminated'
              return (
                <li key={choice.id}>
                  <button
                    type="button"
                    className={`choice ${cls}`}
                    onClick={() => {
                      if (showFeedback || skipped || isOut) return
                      onAnswer(choice.id)
                    }}
                    aria-disabled={showFeedback || skipped || isOut || undefined}
                  >
                    <span className="choice-key" aria-hidden="true">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="choice-label">{choice.label}</span>
                    {isCorrect || isWrong || isOut ? (
                      <span
                        className={`choice-stamp ${
                          isCorrect ? 'is-good' : isWrong ? 'is-logged' : 'is-out'
                        }`}
                      >
                        {isCorrect ? <CheckIcon /> : isWrong ? <AnomalyIcon /> : <ScanIcon />}
                        <span>{isCorrect ? 'Verified' : isWrong ? 'Sample logged' : 'Ruled out'}</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="field-note">
          <div className="field-note-head">
            <p className="field-note-label">
              Field notes <span aria-hidden="true">·</span> {topic.name}
            </p>
            <span className="field-note-ticks" aria-hidden="true">
              {regionNodes.map((node) => {
                const nodeStatus = statusOf(state, node.id)
                return (
                  <span
                    key={node.id}
                    className={`recap-tick is-${nodeStatus}`}
                    title={nodeStatus}
                  />
                )
              })}
            </span>
          </div>
          <p className="field-note-text">{topic.blurb}</p>
          <p className="field-note-region">
            {region.mastered} mastered · {region.charted} recovered · {region.anomaly} anomaly
          </p>
        </div>
      </div>

      <section className="console-foot">
        {dueQuestion ? (
          <div className="signal-strip">
            <span className="signal-icon">
              <AnomalyIcon aria-hidden="true" />
            </span>
            <p className="signal-copy">
              <strong>Signal returning</strong>
              <span>
                {dueQuestion.destination} · {dueQuestion.tag} · due now
              </span>
            </p>
            <button
              type="button"
              className="btn btn--small btn--paper"
              onClick={() => onTrackAnomaly(dueQuestion.id)}
            >
              Track anomaly <kbd>T</kbd>
            </button>
          </div>
        ) : null}

        <div
          className={`foot-readout ${
            correct ? 'is-good' : showFeedback ? 'is-logged' : skipped ? 'is-skipped' : ''
          }`}
        >
          <div
            className="readout-inner"
            key={`${question.id}-${
              showFeedback ? record?.choiceId : skipped ? 'skipped' : retrying ? 'retry' : hintVisible ? 'hint' : 'idle'
            }`}
          >
            {showFeedback ? (
              correct ? (
                <>
                  <p className="readout-head is-good">
                    <span className="readout-glyph">
                      <CheckIcon />
                    </span>
                    Signal confirmed
                    <span className="readout-tail">
                      {status === 'mastered' ? 'mastered first pass' : 'recovered'}
                      {gain.fuel > 0 ? ` · fuel +${gain.fuel}` : ''}
                      {gain.crew ? ` · ${CREW[gain.crew].name} joined` : ''}
                    </span>
                  </p>
                  <p className="readout-text">
                    <span className="readout-label">Analysis complete.</span> {question.explanation}
                  </p>
                  {routeMeta ? (
                    <p className="readout-note">
                      {route === 'safe' ? 'Quiet lane bonus paid.' : 'Storm lane bonus paid — good flying.'}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="readout-head is-logged">
                    <span className="readout-glyph">
                      <AnomalyIcon />
                    </span>
                    Sample logged
                    <span className="readout-tail">anomaly catalogued</span>
                  </p>
                  <p className="readout-text">
                    <span className="readout-label">Analysis complete.</span>{' '}
                    <strong>{correctChoice?.label}</strong> is the reading — not{' '}
                    <em>
                      {record
                        ? question.choices.find((choice) => choice.id === record.choiceId)?.label
                        : 'what we expected'}
                    </em>
                    . {question.explanation}
                  </p>
                  <p className="readout-note">
                    Nothing lost. {question.destination} stays on the chart and returns as a
                    signal. Retry for {EXPEDITION.retryCost} fuel, or track it later.
                  </p>
                </>
              )
            ) : skipped ? (
              <>
                <p className="readout-head is-skipped">
                  <span className="readout-glyph">
                    <SkipIcon />
                  </span>
                  World left behind
                  <span className="readout-tail">anomaly catalogued</span>
                </p>
                <p className="readout-text">
                  <span className="readout-label">Course adjusted.</span> {question.destination}{' '}
                  stays on the chart as a signal. It will come back around when the route does —
                  you can also pick it up from the map.
                </p>
                <p className="readout-note">
                  Skipping only spends fuel. Nothing is lost, and nothing ends the run.
                </p>
              </>
            ) : retrying ? (
              <>
                <p className="readout-head is-retry">
                  <span className="readout-glyph">
                    <RetryIcon />
                  </span>
                  Retry window open
                  <span className="readout-tail">fuel −{EXPEDITION.retryCost}</span>
                </p>
                <p className="readout-text">
                  Take another look, captain. The sample is still warm. Wrong answers only cost
                  optionality here, never the run.
                </p>
              </>
            ) : hintVisible ? (
              <>
                <p className="readout-head is-scan">
                  <span className="readout-glyph">
                    <ScanIcon />
                  </span>
                  Scan complete
                  <span className="readout-tail">2 choices ruled out · −{scanCost} fuel</span>
                </p>
                <p className="readout-text readout-text--hint">
                  <span className="readout-label">Whisper from the void.</span> {question.hint}
                </p>
              </>
            ) : (
              <>
                <p className="readout-head">
                  Your call, captain
                  <span className="readout-tail">
                    {question.choices.length} signals · {state.fuel} fuel
                  </span>
                </p>
                <p className="readout-text readout-text--quiet">
                  Scan rules out two choices. Skip burns 2 fuel. A miss costs no fuel and no run —
                  just a return trip.
                </p>
              </>
            )}
          </div>
        </div>

        <CrewDock state={state} questionId={question.id} onUseCrew={onUseCrew} />

        <div className="console-actions">
          {showFeedback || skipped ? (
            <div className="action-row">
              {showFeedback && !correct ? (
                <button
                  type="button"
                  className="btn btn--paper btn--retry"
                  onClick={onRetry}
                  ref={retryRef}
                  disabled={!canRetry}
                >
                  <RetryIcon aria-hidden="true" />
                  Retry sample <span className="btn-cost">−{EXPEDITION.retryCost}</span>
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--primary btn--land"
                onClick={onLand}
                ref={landRef}
                disabled={landing}
              >
                <span className="btn-land-label">
                  {landing
                    ? 'Touchdown'
                    : skipped
                      ? 'Fly on'
                      : `Fly to ${nextDestination(state, question.destination)}`}
                </span>
                <span className={`btn-arrow ${landing ? 'is-landing' : ''}`} aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          ) : (
            <>
              <div className="action-row">
                <button
                  type="button"
                  className="btn btn--paper btn--scan"
                  onClick={onScan}
                  disabled={!canScan}
                  aria-describedby="scan-cost"
                >
                  <ScanIcon aria-hidden="true" />
                  {hintVisible ? 'Scanned' : 'Scan'}
                  {!hintVisible ? <span className="btn-cost">−{scanCost}</span> : null}
                </button>
                <button
                  type="button"
                  className="btn btn--paper btn--skip"
                  onClick={onSkip}
                  disabled={!canSkip}
                  aria-describedby="skip-cost"
                >
                  <SkipIcon aria-hidden="true" />
                  Skip world <span className="btn-cost">−{EXPEDITION.skipCost}</span>
                </button>
              </div>
              <p className="action-hint" id="scan-cost">
                {hintVisible
                  ? 'Hint on the table. Two choices ruled out.'
                  : canScan
                    ? (
                      <>
                        <span className="hint-keys">Keys 1–4 answer · H scan · S skip</span>
                        <span className="hint-touch">Tap a choice, or scan and skip below.</span>
                      </>
                    )
                    : 'No fuel for extras — answer to chart and salvage more'}
              </p>
              <span className="sr-only" id="skip-cost">
                Skipping leaves this world as an anomaly for 2 fuel.
              </span>
            </>
          )}
        </div>
        <p className="console-footer-line">
          {state.detour ? (
            <>
              Detour · {progress.known}/{progress.total} worlds known · returns to route after this
            </>
          ) : (
            <>
              {progress.known}/{progress.total} known · {progress.anomalies} anomal
              {progress.anomalies === 1 ? 'y' : 'ies'} · {EXPEDITION.sheet}
            </>
          )}
        </p>
      </section>
    </section>
  )
}

function nextDestination(state: ExpeditionState, fallback: string): string {
  if (state.detour) {
    const current = state.itinerary[state.cursor]
    return current ? getQuestion(current).destination : fallback
  }
  const next = state.itinerary[state.cursor + 1]
  return next ? getQuestion(next).destination : 'the station'
}
