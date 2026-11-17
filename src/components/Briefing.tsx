import { CREW, EXPEDITION, TOPICS } from '../data/expedition'
import type { ExpeditionState } from '../lib/session'
import { expeditionProgress } from '../lib/session'
import { FuelGauge } from './FuelGauge'
import { Crewmate } from './Crewmate'
import { CompassDoodle, RocketDoodle } from './Icons'

interface BriefingProps {
  state: ExpeditionState
  onBegin: () => void
}

export function Briefing({ state, onBegin }: BriefingProps) {
  const progress = expeditionProgress(state)
  const regions = Object.values(TOPICS)
  const crew = EXPEDITION.startingCrew.map((id) => CREW[id])

  return (
    <section className="console brief" aria-labelledby="brief-heading">
      <header className="console-meta">
        <p className="node-index">
          Mission brief <span>· docked</span>
        </p>
        <div className="meta-right">
          <FuelGauge fuel={state.fuel} max={EXPEDITION.maxFuel} />
          <p className="console-region">
            <span className="region-dot" aria-hidden="true" />
            Exp 001
          </p>
        </div>
      </header>

      <div className="console-body brief-body">
        <p className="kicker">
          <CompassDoodle aria-hidden="true" />
          Twelve worlds · four regions · no lives to lose
        </p>
        <h2 className="display" id="brief-heading">
          Chart the
          <br />
          <em>near</em> universe.
        </h2>
        <p className="lede">
          Every question is a world. Get it right and it inks into the map for good. Get it wrong
          and the signal keeps singing — a return trip, a sample to re-run, never a lost run.
        </p>

        <div className="brief-crew">
          <p className="brief-crew-label">
            Aboard <span>one-shot perks, spend them wisely</span>
          </p>
          <ul className="brief-crew-list">
            {crew.map((member) => (
              <li key={member.id} className="brief-crew-item">
                <Crewmate color={member.color} size={38} />
                <span className="brief-crew-copy">
                  <span className="brief-crew-name">{member.name}</span>
                  <span className="brief-crew-role">
                    {member.role} · {member.perk}
                  </span>
                  <span className="brief-crew-effect">{member.effect}</span>
                </span>
              </li>
            ))}
            <li className="brief-crew-item brief-crew-item--mystery">
              <span className="brief-crew-mystery" aria-hidden="true">
                ?
              </span>
              <span className="brief-crew-copy">
                <span className="brief-crew-name">Two more</span>
                <span className="brief-crew-role">Down the forks</span>
                <span className="brief-crew-effect">
                  The lane you pick decides who walks through the airlock.
                </span>
              </span>
            </li>
          </ul>
        </div>

        <ol className="rules">
          <li>
            <span className="rule-no">01</span>
            <div>
              <h3>Chart it</h3>
              <p>A verified signal lights the node and inks its constellation.</p>
            </div>
          </li>
          <li>
            <span className="rule-no">02</span>
            <div>
              <h3>Spend fuel</h3>
              <p>Scan rules out two answers, skip buys a detour, retry buys another look.</p>
            </div>
          </li>
          <li>
            <span className="rule-no">03</span>
            <div>
              <h3>Pick a lane</h3>
              <p>At a fork, the calm route is kinder. The storm pays more. Neither ends you.</p>
            </div>
          </li>
          <li>
            <span className="rule-no">04</span>
            <div>
              <h3>Follow the signal</h3>
              <p>Missed worlds resurface as anomalies. Tracking one is staying curious.</p>
            </div>
          </li>
        </ol>
      </div>

      <footer className="console-foot brief-foot">
        <div className="brief-stats">
          <div>
            <span className="stat-value">{progress.total}</span>
            <span className="stat-label">Worlds</span>
          </div>
          <div>
            <span className="stat-value">{regions.length}</span>
            <span className="stat-label">Regions</span>
          </div>
          <div>
            <span className="stat-value">
              {String(Math.round(progress.total * 0.6)).padStart(2, '0')}
              <span className="stat-unit">min</span>
            </span>
            <span className="stat-label">Estimated</span>
          </div>
          <div>
            <span className="stat-value">{state.fuel}</span>
            <span className="stat-label">Fuel cells</span>
          </div>
        </div>

        <button type="button" className="btn btn--primary btn--wide btn--launch" onClick={onBegin}>
          <RocketDoodle aria-hidden="true" />
          Launch expedition
          <span className="btn-arrow" aria-hidden="true">
            →
          </span>
        </button>
        <p className="action-hint brief-keys">
          Prefer keys? <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>H</kbd> scan · <kbd>S</kbd> skip ·{' '}
          <kbd>Enter</kbd> flies on.
        </p>
      </footer>

      <ul className="sr-only" aria-label="Chart regions">
        {regions.map((region) => (
          <li key={region.id}>
            {region.name}, {region.discipline}. {region.blurb}
          </li>
        ))}
      </ul>
    </section>
  )
}
