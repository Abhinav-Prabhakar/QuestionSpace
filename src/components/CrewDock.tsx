import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { CREW, type CrewId } from '../data/expedition'
import { activePassFor, type ExpeditionState } from '../lib/session'
import { Crewmate } from './Crewmate'
import { CrewIcon } from './Icons'

interface CrewDockProps {
  state: ExpeditionState
  questionId: string
  onUseCrew: (id: CrewId) => void
}

export function CrewDock({ state, questionId, onUseCrew }: CrewDockProps) {
  const [open, setOpen] = useState<CrewId | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const record = state.answers[questionId]
  const pass = activePassFor(state)
  const answered = record?.pass === pass
  const canRetry = Boolean(record && !record.correct && record.pass === pass)
  const scanned = state.hints.includes(questionId)

  const reason = (id: CrewId): string | null => {
    if (id === 'pip' && answered) return 'Already sampled this world'
    if (id === 'vela' && answered) return 'Already sampled this world'
    if (id === 'vela' && scanned) return 'Scan already complete'
    if (id === 'moss' && !canRetry) return 'Only after a sample is logged'
    if (id === 'moss' && state.openRetry === questionId) return 'Retry already open'
    return null
  }

  useEffect(() => {
    setOpen(null)
  }, [questionId, state.cursor, state.detour?.id])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="crew-dock" ref={wrapRef}>
      <p className="crew-dock-label">
        <CrewIcon aria-hidden="true" /> Crew <span>one-shot perks</span>
      </p>

      {state.crew.length === 0 ? (
        <p className="crew-empty">Deck empty. Everyone is busy being heroic.</p>
      ) : (
        <ul className="crew-strip">
          {state.crew.map((id) => {
            const member = CREW[id]
            const blocked = reason(id)
            return (
              <li key={id} className="crew-slot">
                <button
                  type="button"
                  className={`crew-button ${open === id ? 'is-open' : ''}`}
                  onClick={() => setOpen(open === id ? null : id)}
                  aria-expanded={open === id}
                  aria-controls={`crew-card-${id}`}
                >
                  <Crewmate color={member.color} size={38} />
                  <span className="crew-button-copy">
                    <span className="crew-button-name">{member.name}</span>
                    <span className="crew-button-role">{member.role}</span>
                  </span>
                </button>

                {open === id ? (
                  <div
                    className="crew-card"
                    id={`crew-card-${id}`}
                    style={{ '--crew-color': member.color } as CSSProperties}
                  >
                    <p className="crew-card-kicker">{member.role}</p>
                    <p className="crew-card-name">{member.name}</p>
                    <p className="crew-card-quip">“{member.quip}”</p>
                    <p className="crew-card-effect">{member.effect}</p>
                    <div className="crew-card-actions">
                      <button
                        type="button"
                        className="btn btn--small btn--ink"
                        disabled={Boolean(blocked)}
                        onClick={() => {
                          onUseCrew(id)
                          setOpen(null)
                        }}
                      >
                        {blocked ? 'Not now' : `Use ${member.perk}`}
                      </button>
                      <button
                        type="button"
                        className="btn btn--small btn--ghost"
                        onClick={() => setOpen(null)}
                      >
                        Close
                      </button>
                    </div>
                    {blocked ? <p className="crew-card-hint">{blocked}</p> : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
