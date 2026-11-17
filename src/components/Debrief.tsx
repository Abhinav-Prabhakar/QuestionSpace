import { useState } from 'react'
import {
  CREW,
  EXPEDITION,
  TOPICS,
  getQuestion,
  getTopic,
  topicQuestions,
} from '../data/expedition'
import {
  anomalyIds,
  expeditionProgress,
  regionStats,
  statusOf,
  type ExpeditionState,
} from '../lib/session'
import { buildCaptainLog, formatElapsed } from '../lib/log'
import { Crewmate } from './Crewmate'
import { AnomalyIcon, CheckIcon, ShareIcon, StarIcon } from './Icons'
import { FuelGauge } from './FuelGauge'

interface DebriefProps {
  state: ExpeditionState
  onRevisit: () => void
  onReset: () => void
}

export function Debrief({ state, onRevisit, onReset }: DebriefProps) {
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const progress = expeditionProgress(state)
  const anomalies = anomalyIds(state)
  const regions = Object.values(TOPICS)
  const log = buildCaptainLog(state)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const share = async () => {
    const payload = { title: 'QuestionSpace — captain’s log', text: log }
    try {
      if (canShare) {
        await navigator.share(payload)
        return
      }
      await navigator.clipboard.writeText(log)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      /* share sheet dismissed, or clipboard blocked */
    }
  }

  return (
    <section className="console brief debrief" aria-labelledby="debrief-heading">
      <header className="console-meta">
        <p className="node-index">
          Captain’s log <span>· debrief</span>
        </p>
        <div className="meta-right">
          <FuelGauge fuel={state.fuel} max={EXPEDITION.maxFuel} />
          <p className="console-region">
            <span className="region-dot" aria-hidden="true" />
            {formatElapsed(state.startedAt, state.finishedAt)} elapsed
          </p>
        </div>
      </header>

      <div className="console-body brief-body">
        <p className="kicker">
          <AnomalyIcon aria-hidden="true" />
          Expedition complete · {EXPEDITION.sheet}
        </p>
        <h2 className="display" id="debrief-heading">
          The chart,
          <br />
          <em>as we left it.</em>
        </h2>
        <p className="lede">
          {progress.known} of {progress.total} worlds {progress.known === 1 ? 'is' : 'are'} inked.{' '}
          {progress.anomalies} signal{progress.anomalies === 1 ? ' is' : 's are'} still singing.
          Nothing here is a score to be ashamed of — it is a map of what you know and what is still
          out there.
        </p>

        <dl className="debrief-stats" aria-label="Expedition summary">
          <div>
            <dt>Known</dt>
            <dd>
              {progress.known}
              <span>/{progress.total}</span>
            </dd>
          </div>
          <div>
            <dt>Mastered</dt>
            <dd>{progress.mastered}</dd>
          </div>
          <div>
            <dt>Recovered</dt>
            <dd>{progress.charted}</dd>
          </div>
          <div>
            <dt>Anomalies</dt>
            <dd>{progress.anomalies}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>
              {progress.accuracy}
              <span>%</span>
            </dd>
          </div>
          <div>
            <dt>Fuel burned</dt>
            <dd>{progress.fuelSpent}</dd>
          </div>
        </dl>

        <section className="log-panel" aria-labelledby="log-heading">
          <header className="log-head">
            <div>
              <p className="log-kicker">Auto-generated · shareable</p>
              <h3 className="log-title" id="log-heading">
                Captain’s log
              </h3>
            </div>
            <button type="button" className="btn btn--small btn--paper" onClick={share}>
              <ShareIcon aria-hidden="true" />
              {canShare ? 'Share log' : 'Copy log'}
            </button>
          </header>
          <pre className="log-text">{log}</pre>
          <p className="sr-only" role="status" aria-live="polite">
            {copied ? 'Captain’s log copied to the clipboard.' : ''}
          </p>
          {copied ? <p className="log-copied">Copied to the clipboard, captain.</p> : null}
        </section>

        <div className="debrief-regions">
          <p className="region-list-title">
            <StarIcon aria-hidden="true" /> Regions
          </p>
          <ul className="debrief-region-list">
            {regions.map((region) => {
              const ids = topicQuestions(region.id).map((question) => question.id)
              const stats = regionStats(state, ids)
              const known = stats.mastered + stats.charted
              return (
                <li key={region.id} className="debrief-region">
                  <span
                    className="region-dot"
                    style={{ background: region.hue }}
                    aria-hidden="true"
                  />
                  <span className="debrief-region-name">{region.name}</span>
                  <span className="debrief-region-sub">{region.discipline}</span>
                  <span className="debrief-region-pips" aria-hidden="true">
                    {ids.map((id) => {
                      const status = statusOf(state, id)
                      return (
                        <span key={id} className={`recap-tick is-${status}`} title={status} />
                      )
                    })}
                  </span>
                  <span className="debrief-region-count">
                    {known}/{ids.length}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {anomalies.length > 0 ? (
          <div className="anomaly-list-wrap">
            <p className="region-list-title">
              <AnomalyIcon aria-hidden="true" /> Still singing
            </p>
            <ul className="anomaly-list">
              {anomalies.map((id) => {
                const question = getQuestion(id)
                const topic = getTopic(question.topicId)
                return (
                  <li key={id} className="anomaly-item">
                    <span className="anomaly-mark" aria-hidden="true">
                      <AnomalyIcon />
                    </span>
                    <span className="anomaly-copy">
                      <span className="anomaly-dest">{question.destination}</span>
                      <span className="anomaly-tag">
                        {topic.name} · {question.tag}
                      </span>
                    </span>
                    <span className="anomaly-returns">
                      {state.anomalies[id].returns} return
                      {state.anomalies[id].returns === 1 ? '' : 's'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <p className="debrief-quiet">
            <CheckIcon aria-hidden="true" /> No anomalies left. The chart is quiet, captain.
          </p>
        )}

        <div className="debrief-crew">
          <p className="region-list-title">Crew manifest</p>
          <ul className="debrief-crew-list">
            {state.crewEver.map((id) => {
              const member = CREW[id]
              const spent = state.crewUsed.includes(id)
              return (
                <li key={id} className={`debrief-crew-item ${spent ? 'is-spent' : ''}`}>
                  <Crewmate color={member.color} size={40} />
                  <span>
                    <span className="debrief-crew-name">{member.name}</span>
                    <span className="debrief-crew-role">
                      {member.role} · {spent ? 'perk spent' : 'perk aboard'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <footer className="console-foot debrief-foot">
        <div className="action-row">
          {anomalies.length > 0 ? (
            <button type="button" className="btn btn--primary btn--wide" onClick={onRevisit}>
              <AnomalyIcon aria-hidden="true" />
              Track {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'}
              <span className="btn-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className={`btn ${confirmReset ? 'btn--danger' : 'btn--paper'}`}
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true)
                return
              }
              setConfirmReset(false)
              onReset()
            }}
          >
            {confirmReset ? 'Yes, wipe the chart' : 'New expedition'}
          </button>
        </div>
        <p className="action-hint">
          {confirmReset
            ? 'Click again to confirm. The chart and crew reset to launch.'
            : 'Revisiting anomalies keeps the same crew, fuel, and chart.'}
        </p>
      </footer>
    </section>
  )
}
