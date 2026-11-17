import { EXPEDITION } from '../data/expedition'
import { MotionIcon, RocketDoodle, SoundIcon } from './Icons'

interface TopBarProps {
  sound: boolean
  motion: boolean
  onToggleSound: () => void
  onToggleMotion: () => void
}

export function TopBar({ sound, motion, onToggleSound, onToggleMotion }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <RocketDoodle />
        </span>
        <div className="brand-copy">
          <p className="brand-name">
            Question<span>space</span>
          </p>
          <p className="brand-sub">A field guide to the near universe</p>
        </div>
      </div>

      <p className="topbar-sheet">
        <span aria-hidden="true">✦</span> {EXPEDITION.sheet} <span aria-hidden="true">✦</span>
      </p>

      <div className="topbar-tools">
        <button
          type="button"
          className={`switch ${sound ? 'is-on' : ''}`}
          role="switch"
          aria-checked={sound}
          aria-label={`Sound ${sound ? 'on' : 'off'}`}
          onClick={onToggleSound}
        >
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <SoundIcon className="switch-icon" muted={!sound} />
          <span className="switch-label">Sound</span>
        </button>
        <button
          type="button"
          className={`switch ${motion ? 'is-on' : ''}`}
          role="switch"
          aria-checked={motion}
          aria-label={`Motion ${motion ? 'on' : 'off'}`}
          onClick={onToggleMotion}
        >
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb" />
          </span>
          <MotionIcon className="switch-icon" />
          <span className="switch-label">Motion</span>
        </button>
      </div>
    </header>
  )
}
