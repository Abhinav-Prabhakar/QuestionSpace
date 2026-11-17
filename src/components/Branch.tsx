import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import {
  CREW,
  DIFFICULTY_LABEL,
  EXPEDITION,
  ROUTES,
  getQuestion,
  getTopic,
  type RouteKind,
} from '../data/expedition'
import type { ExpeditionState } from '../lib/session'
import { FuelGauge } from './FuelGauge'
import { Crewmate } from './Crewmate'
import { BranchIcon, StarIcon } from './Icons'

interface BranchProps {
  state: ExpeditionState
  onChoose: (route: RouteKind) => void
}

function RouteCard({
  state,
  kind,
  questionId,
  shortcut,
  onChoose,
}: {
  state: ExpeditionState
  kind: RouteKind
  questionId: string
  shortcut: string
  onChoose: (route: RouteKind) => void
}) {
  const route = ROUTES[kind]
  const question = getQuestion(questionId)
  const topic = getTopic(question.topicId)
  const recruit = CREW[route.recruit]
  const already = state.crewEver.includes(recruit.id)

  return (
    <button
      type="button"
      className={`route-card route-card--${kind}`}
      onClick={() => onChoose(kind)}
      style={{ '--route-color': route.color } as CSSProperties}
    >
      <span className="route-flag">
        <BranchIcon aria-hidden="true" />
        {kind === 'safe' ? 'SAFE LANE' : 'RISKY LANE'}
        <kbd>{shortcut}</kbd>
      </span>
      <span className="route-name">{route.name}</span>
      <span className="route-sub">{route.sub}</span>
      <span className="route-blurb">“{route.blurb}”</span>

      <span className="route-preview">
        <span className="route-preview-label">Next signal</span>
        <span className="route-destination">{question.destination}</span>
        <span className="route-tag">
          {topic.name} · {question.tag}
        </span>
        <span className="route-difficulty">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`difficulty-pip ${i < question.difficulty ? 'is-on' : ''}`}
            />
          ))}
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </span>

      <span className="route-reward">
        <span className="route-reward-item">
          <StarIcon aria-hidden="true" /> +{route.rewardFuel} fuel on a clean pass
        </span>
        <span className="route-reward-item route-recruit">
          <Crewmate color={recruit.color} size={30} />
          {already ? `+1 extra fuel (${recruit.name} already aboard)` : `Recruit ${recruit.name}`}
        </span>
      </span>
    </button>
  )
}

export function Branch({ state, onChoose }: BranchProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const junction = state.junction

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  if (!junction) return null

  return (
    <section className="console branch" aria-labelledby="branch-heading">
      <header className="console-meta">
        <p className="node-index">
          Junction {(EXPEDITION.junctions.indexOf(junction.cursor) + 1).toString().padStart(2, '0')}
          <span> / {String(EXPEDITION.junctions.length).padStart(2, '0')}</span>
        </p>
        <div className="meta-right">
          <FuelGauge fuel={state.fuel} max={EXPEDITION.maxFuel} />
          <p className="console-region">
            <span className="region-dot" aria-hidden="true" />
            Route call
          </p>
        </div>
      </header>

      <div className="console-body branch-body">
        <p className="kicker">The chart forks here</p>
        <h2 className="display branch-title" id="branch-heading" tabIndex={-1} ref={headingRef}>
          Pick a lane, <em>captain.</em>
        </h2>
        <p className="lede">
          Same destination, different weather. The calm lane is kinder; the storm pays better.
          Neither one can end the run.
        </p>

        <div className="route-options">
          <RouteCard
            state={state}
            kind="safe"
            questionId={junction.safeId}
            shortcut="1"
            onChoose={onChoose}
          />
          <RouteCard
            state={state}
            kind="risky"
            questionId={junction.riskyId}
            shortcut="2"
            onChoose={onChoose}
          />
        </div>
      </div>

      <footer className="console-foot branch-foot">
        <p className="action-hint">
          Keys <kbd>1</kbd> or <kbd>2</kbd> choose a lane. Rewards land only on a clean pass.
        </p>
      </footer>
    </section>
  )
}
