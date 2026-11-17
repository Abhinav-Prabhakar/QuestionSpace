import { useEffect, useRef, useState } from 'react'
import {
  EXPEDITION,
  ROUTES,
  TOPICS,
  getQuestion,
  getTopic,
  topicQuestions,
  type Question,
  type TopicId,
} from '../data/expedition'
import {
  activeQuestionId,
  dueAnomalyIds,
  expeditionProgress,
  isDue,
  statusOf,
  type ExpeditionState,
  type NodeStatus,
} from '../lib/session'
import {
  AnomalyIcon,
  CheckIcon,
  CompassDoodle,
  ScanIcon,
  StarIcon,
} from './Icons'

export interface Flight {
  /** Bumped on every departure, so the window can replay its travel animation. */
  key: number
}

interface StarMapProps {
  state: ExpeditionState
  flight: Flight | null
  landingKey: number
  /** Motion allowed (system preference + in-app override). */
  motion: boolean
  landing: boolean
  onTrackAnomaly: (id: string) => void
}

const STATUS_LABEL: Record<NodeStatus, string> = {
  mastered: 'Mastered',
  charted: 'Charted',
  anomaly: 'Signal',
  uncharted: 'Uncharted',
}

function statusSentence(status: NodeStatus): string {
  if (status === 'mastered') return 'Charted clean on the first pass. This world is inked for good.'
  if (status === 'charted') return 'Came back from a signal and settled into the chart.'
  if (status === 'anomaly') return 'Sample logged. The signal is still singing out here.'
  return 'Still just a rumour. Fly here to find out what it is.'
}

type WorldKind =
  | 'banded'
  | 'rocky'
  | 'ocean'
  | 'icy'
  | 'hazy'
  | 'metallic'
  | 'galaxy'
  | 'cluster'
  | 'deepfield'

interface WorldLook {
  r: number
  base: string
  deep: string
  light: string
  kind: WorldKind
  /** Draw a ring around the world. */
  ring?: boolean
  ringColor?: string
  moons?: { angle: number; dist: number; r: number; color: string }[]
}

/**
 * Every world gets its own face. These are hand-tuned rather than generated:
 * a ringed giant, an ocean world, a spiral galaxy, an ice moon with cracks.
 */
const LOOKS: Record<string, WorldLook> = {
  'mes-01': {
    r: 34,
    base: '#D9A066',
    deep: '#7E4C24',
    light: '#F7DCAC',
    kind: 'banded',
    ring: true,
    ringColor: '#EBC58C',
    moons: [{ angle: 32, dist: 46, r: 5, color: '#C9D6E4' }],
  },
  'mes-02': {
    r: 28,
    base: '#5FA8C7',
    deep: '#16465C',
    light: '#BFE9F4',
    kind: 'ocean',
    moons: [{ angle: 210, dist: 36, r: 3.6, color: '#E7DCC6' }],
  },
  'mes-03': {
    r: 30,
    base: '#C4695D',
    deep: '#5E2622',
    light: '#F1A38F',
    kind: 'rocky',
  },
  'dae-01': {
    r: 26,
    base: '#9AA3B2',
    deep: '#454E60',
    light: '#E2E8F0',
    kind: 'rocky',
  },
  'dae-02': {
    r: 29,
    base: '#B79A78',
    deep: '#5E4736',
    light: '#EAD5B8',
    kind: 'rocky',
  },
  'dae-03': {
    r: 28,
    base: '#C9A227',
    deep: '#5F490C',
    light: '#F8E49A',
    kind: 'metallic',
    ring: true,
    ringColor: '#D9BE68',
  },
  'hub-01': {
    r: 33,
    base: '#A9ACE8',
    deep: '#2E3170',
    light: '#F1F2FF',
    kind: 'galaxy',
  },
  'hub-02': {
    r: 30,
    base: '#9C93C9',
    deep: '#262244',
    light: '#DBD5FF',
    kind: 'deepfield',
  },
  'hub-03': {
    r: 29,
    base: '#8FA6D9',
    deep: '#243558',
    light: '#DCE7FF',
    kind: 'cluster',
  },
  'gal-01': {
    r: 25,
    base: '#D7E7EF',
    deep: '#6F8CA1',
    light: '#FFFFFF',
    kind: 'icy',
    moons: [{ angle: 300, dist: 34, r: 3.4, color: '#B9D3E0' }],
  },
  'gal-02': {
    r: 27,
    base: '#D6C7AC',
    deep: '#6E5D45',
    light: '#FFF6E4',
    kind: 'icy',
  },
  'gal-03': {
    r: 32,
    base: '#D9903F',
    deep: '#67330F',
    light: '#FFD392',
    kind: 'hazy',
    moons: [{ angle: 140, dist: 42, r: 4.2, color: '#E8C79A' }],
  },
}

function lookOf(id: string): WorldLook {
  return LOOKS[id] ?? { r: 24, base: '#9BA8C0', deep: '#3A465E', light: '#E4EBF7', kind: 'rocky' }
}

/* --------------------------------------------------------------------------
   Surface art (shared by the big window and the little chart)
   -------------------------------------------------------------------------- */

function Surface({ look, id }: { look: WorldLook; id: string }) {
  const { r, deep, light, base, kind } = look
  const clip = `url(#wclip-${id})`

  if (kind === 'banded') {
    return (
      <g clipPath={clip} aria-hidden="true">
        <path
          d={`M ${-r} ${-r * 0.42} Q 0 ${-r * 0.62} ${r} ${-r * 0.38}`}
          fill="none"
          stroke={light}
          strokeWidth={r * 0.17}
          opacity="0.45"
        />
        <path
          d={`M ${-r} ${r * 0.06} Q 0 ${-r * 0.1} ${r} ${r * 0.1}`}
          fill="none"
          stroke={deep}
          strokeWidth={r * 0.2}
          opacity="0.4"
        />
        <path
          d={`M ${-r} ${r * 0.5} Q 0 ${r * 0.34} ${r} ${r * 0.52}`}
          fill="none"
          stroke={light}
          strokeWidth={r * 0.12}
          opacity="0.35"
        />
        <ellipse cx={-r * 0.42} cy={r * 0.3} rx={r * 0.18} ry={r * 0.1} fill={light} opacity="0.4" />
      </g>
    )
  }

  if (kind === 'ocean') {
    return (
      <g clipPath={clip} aria-hidden="true">
        <path
          d={`M ${-r} ${-r * 0.15} Q ${-r * 0.3} ${-r * 0.5} ${r * 0.2} ${-r * 0.2} T ${r} ${-r * 0.28}`}
          fill="none"
          stroke={light}
          strokeWidth={r * 0.22}
          opacity="0.4"
          strokeLinecap="round"
        />
        <path
          d={`M ${-r} ${r * 0.35} Q ${-r * 0.4} ${r * 0.1} ${r * 0.1} ${r * 0.42} T ${r} ${r * 0.3}`}
          fill="none"
          stroke={light}
          strokeWidth={r * 0.18}
          opacity="0.3"
          strokeLinecap="round"
        />
        <ellipse cx={r * 0.4} cy={-r * 0.45} rx={r * 0.26} ry={r * 0.13} fill={light} opacity="0.35" />
      </g>
    )
  }

  if (kind === 'icy') {
    return (
      <g clipPath={clip} aria-hidden="true">
        <path
          d={`M ${-r * 0.8} ${-r * 0.5} Q ${-r * 0.1} ${-r * 0.2} ${r * 0.2} ${r * 0.4}`}
          fill="none"
          stroke={deep}
          strokeWidth={Math.max(1.2, r * 0.05)}
          opacity="0.45"
          strokeLinecap="round"
        />
        <path
          d={`M ${-r * 0.2} ${-r * 0.75} Q ${r * 0.1} ${-r * 0.1} ${r * 0.7} ${r * 0.3}`}
          fill="none"
          stroke={deep}
          strokeWidth={Math.max(1.1, r * 0.045)}
          opacity="0.4"
          strokeLinecap="round"
        />
        <path
          d={`M ${-r * 0.7} ${r * 0.35} Q ${-r * 0.2} ${r * 0.5} ${r * 0.25} ${r * 0.78}`}
          fill="none"
          stroke={deep}
          strokeWidth={Math.max(1, r * 0.04)}
          opacity="0.32"
          strokeLinecap="round"
        />
        <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.3} ry={r * 0.18} fill={light} opacity="0.6" />
      </g>
    )
  }

  if (kind === 'hazy') {
    return (
      <g aria-hidden="true">
        <circle r={r * 1.16} fill={light} opacity="0.1" />
        <g clipPath={clip}>
          <path
            d={`M ${-r} ${-r * 0.5} Q 0 ${-r * 0.74} ${r} ${-r * 0.46}`}
            fill="none"
            stroke={light}
            strokeWidth={r * 0.2}
            opacity="0.35"
          />
          <path
            d={`M ${-r} ${r * 0.18} Q 0 ${r * 0.02} ${r} ${r * 0.22}`}
            fill="none"
            stroke={deep}
            strokeWidth={r * 0.24}
            opacity="0.3"
          />
          <ellipse cx={r * 0.32} cy={-r * 0.52} rx={r * 0.24} ry={r * 0.12} fill={light} opacity="0.4" />
        </g>
      </g>
    )
  }

  if (kind === 'metallic') {
    return (
      <g clipPath={clip} aria-hidden="true">
        <path
          d={`M ${-r * 0.75} ${-r * 0.15} L ${r * 0.05} ${-r * 0.62}`}
          stroke={light}
          strokeWidth={r * 0.18}
          strokeLinecap="round"
          opacity="0.5"
        />
        <ellipse cx={-r * 0.28} cy={r * 0.4} rx={r * 0.3} ry={r * 0.16} fill={deep} opacity="0.35" />
        <ellipse cx={r * 0.44} cy={r * 0.16} rx={r * 0.16} ry={r * 0.09} fill={deep} opacity="0.28" />
        <ellipse cx={r * 0.1} cy={-r * 0.3} rx={r * 0.12} ry={r * 0.07} fill={light} opacity="0.45" />
      </g>
    )
  }

  if (kind === 'galaxy') {
    return (
      <g aria-hidden="true">
        <ellipse rx={r * 1.5} ry={r * 0.6} fill={base} opacity="0.14" />
        <g transform="rotate(-16)">
          <ellipse
            rx={r * 1.22}
            ry={r * 0.4}
            fill="none"
            stroke={light}
            strokeWidth="1.5"
            opacity="0.55"
          />
          <path
            d={`M ${-r * 1.2} 0 C ${-r * 0.55} ${-r * 0.72} ${r * 0.55} ${r * 0.74} ${r * 1.2} 0`}
            fill="none"
            stroke={light}
            strokeWidth={Math.max(2, r * 0.02)}
            opacity="0.75"
            strokeLinecap="round"
          />
          <path
            d={`M ${-r * 1.2} 0 C ${-r * 0.42} ${r * 0.62} ${r * 0.46} ${-r * 0.68} ${r * 1.2} 0`}
            fill="none"
            stroke={base}
            strokeWidth={Math.max(2, r * 0.019)}
            opacity="0.85"
            strokeLinecap="round"
          />
          <ellipse rx={r * 0.4} ry={r * 0.24} fill={light} opacity="0.9" />
          <circle r={r * 0.12} fill={deep} opacity="0.8" />
        </g>
      </g>
    )
  }

  if (kind === 'cluster') {
    const galaxies = [
      { x: -0.52, y: -0.28, rx: 0.24, ry: 0.12 },
      { x: 0.28, y: -0.44, rx: 0.18, ry: 0.1 },
      { x: 0.36, y: 0.3, rx: 0.26, ry: 0.12 },
      { x: -0.08, y: 0.08, rx: 0.42, ry: 0.18 },
    ]
    return (
      <g aria-hidden="true">
        <circle r={r * 1.08} fill={base} opacity="0.1" />
        {galaxies.map((g, i) => (
          <ellipse
            key={i}
            cx={r * g.x}
            cy={r * g.y}
            rx={r * g.rx}
            ry={r * g.ry}
            fill={light}
            opacity={i === 3 ? 0.5 : 0.7}
            transform={`rotate(${i * 24 - 20} ${r * g.x} ${r * g.y})`}
          />
        ))}
        <path
          d={`M ${-r * 0.95} ${r * 0.2} Q ${-r * 0.25} ${-r * 0.55} ${r * 0.9} ${-r * 0.15}`}
          fill="none"
          stroke={light}
          strokeWidth="1.2"
          opacity="0.5"
        />
        <path
          d={`M ${-r * 0.8} ${-r * 0.55} Q ${-r * 0.1} ${r * 0.05} ${r * 0.8} ${r * 0.6}`}
          fill="none"
          stroke={light}
          strokeWidth="1"
          opacity="0.35"
        />
      </g>
    )
  }

  // deep field: a scatter of tiny galaxies
  const field = [
    { x: -0.5, y: -0.42, rx: 0.16, ry: 0.08 },
    { x: 0.18, y: -0.52, rx: 0.12, ry: 0.07 },
    { x: 0.52, y: -0.1, rx: 0.2, ry: 0.1 },
    { x: -0.34, y: 0.18, rx: 0.22, ry: 0.1 },
    { x: 0.1, y: 0.46, rx: 0.14, ry: 0.08 },
    { x: -0.62, y: 0.34, rx: 0.1, ry: 0.06 },
    { x: 0.44, y: 0.62, rx: 0.08, ry: 0.05 },
  ]
  return (
    <g aria-hidden="true">
      <circle r={r * 1.05} fill={base} opacity="0.09" />
      {field.map((g, i) => (
        <ellipse
          key={i}
          cx={r * g.x}
          cy={r * g.y}
          rx={r * g.rx}
          ry={r * g.ry}
          fill={i % 3 === 0 ? light : base}
          opacity={0.55 + (i % 3) * 0.1}
          transform={`rotate(${i * 31 + 8} ${r * g.x} ${r * g.y})`}
        />
      ))}
    </g>
  )
}

/** Distinct crater / texture art for rocky worlds, kept tiny. */
function RockySurface({ look, id }: { look: WorldLook; id: string }) {
  const { r, deep, light } = look
  const craters = [
    { x: -0.34, y: -0.28, s: 0.2 },
    { x: -0.02, y: 0.16, s: 0.13 },
    { x: -0.46, y: 0.26, s: 0.1 },
    { x: 0.34, y: -0.4, s: 0.07 },
  ]
  return (
    <g clipPath={`url(#wclip-${id})`} aria-hidden="true">
      {craters.map((c, i) => (
        <g key={i}>
          <circle cx={r * c.x} cy={r * c.y} r={r * c.s} fill={deep} opacity="0.3" />
          <circle
            cx={r * c.x - r * c.s * 0.3}
            cy={r * c.y - r * c.s * 0.3}
            r={r * c.s * 0.55}
            fill={light}
            opacity="0.22"
          />
        </g>
      ))}
      <ellipse cx={r * 0.3} cy={r * 0.42} rx={r * 0.26} ry={r * 0.12} fill={deep} opacity="0.24" />
    </g>
  )
}

function WorldArt({ look, id }: { look: WorldLook; id: string }) {
  const { r, base, deep, light, kind, ring, ringColor } = look
  const gradientId = `wgrad-${id}`
  const isField = kind === 'galaxy' || kind === 'cluster' || kind === 'deepfield'

  return (
    <g className="world-art">
      <defs>
        <radialGradient id={gradientId} cx="34%" cy="28%" r="82%">
          <stop offset="0%" stopColor={light} />
          <stop offset="42%" stopColor={base} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <clipPath id={`wclip-${id}`}>
          <circle r={r} />
        </clipPath>
      </defs>

      {ring ? (
        <g transform="rotate(-19)" aria-hidden="true">
          <ellipse
            rx={r * 1.78}
            ry={r * 0.46}
            fill="none"
            stroke={ringColor ?? light}
            strokeWidth={r * 0.15}
            opacity="0.5"
          />
        </g>
      ) : null}

      {isField ? (
        <Surface look={look} id={id} />
      ) : (
        <g>
          <circle r={r} fill={`url(#${gradientId})`} stroke="#0A1020" strokeWidth="1.6" />
          {kind === 'rocky' ? <RockySurface look={look} id={id} /> : <Surface look={look} id={id} />}
          <path
            d={`M ${-r * 0.72} ${-r * 0.5} A ${r * 0.9} ${r * 0.9} 0 0 1 ${-r * 0.28} ${-r * 0.82}`}
            fill="none"
            stroke={light}
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>
      )}
    </g>
  )
}

/* --------------------------------------------------------------------------
   The window: one world, seen up close
   -------------------------------------------------------------------------- */

function BigWorld({
  question,
  status,
  r,
  x,
  y,
  className = '',
  alert = false,
}: {
  question: Question
  status: NodeStatus
  r: number
  x: number
  y: number
  className?: string
  alert?: boolean
}) {
  const look = lookOf(question.id)
  const id = `${question.id}-v`
  const { base, deep, light, kind, ring, ringColor } = look
  const isField = kind === 'galaxy' || kind === 'cluster' || kind === 'deepfield'
  const scaled: WorldLook = { ...look, r }
  const moons = look.moons?.map((moon) => ({
    angle: moon.angle,
    dist: moon.dist * (r / look.r) * 1.32,
    r: Math.max(3, moon.r * (r / look.r) * 1.15),
    color: moon.color,
  }))

  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`big-world ${className}`.trim()}>
      <defs>
        <radialGradient id={`wgrad-${id}`} cx="32%" cy="26%" r="84%">
          <stop offset="0%" stopColor={light} />
          <stop offset="40%" stopColor={base} />
          <stop offset="100%" stopColor={deep} />
        </radialGradient>
        <radialGradient id={`vshade-${id}`} cx="30%" cy="24%" r="92%">
          <stop offset="48%" stopColor="#04070f" stopOpacity="0" />
          <stop offset="82%" stopColor="#04070f" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#04070f" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id={`vglow-${id}`}>
          <stop offset="55%" stopColor={base} stopOpacity="0.32" />
          <stop offset="100%" stopColor={base} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`wclip-${id}`}>
          <circle r={r} />
        </clipPath>
        <clipPath id={`vringf-${id}`}>
          <rect x={-r * 3} y={0} width={r * 6} height={r * 3} />
        </clipPath>
      </defs>

      <circle r={r * 1.5} fill={`url(#vglow-${id})`} aria-hidden="true" />

      {ring && !isField ? (
        <g className="big-ring" transform="rotate(-18)" aria-hidden="true">
          <ellipse
            rx={r * 1.9}
            ry={r * 0.46}
            fill="none"
            stroke={ringColor ?? light}
            strokeWidth={r * 0.13}
            opacity="0.26"
          />
        </g>
      ) : null}

      {isField ? (
        <Surface look={scaled} id={id} />
      ) : (
        <g>
          <circle r={r} fill={`url(#wgrad-${id})`} />
          {kind === 'rocky' ? (
            <RockySurface look={scaled} id={id} />
          ) : (
            <Surface look={scaled} id={id} />
          )}
          <circle r={r} fill={`url(#vshade-${id})`} aria-hidden="true" />
          <circle
            r={r}
            fill="none"
            stroke={light}
            strokeOpacity="0.24"
            strokeWidth="1.4"
            aria-hidden="true"
          />
          <path
            d={`M ${-r * 0.74} ${-r * 0.48} A ${r * 0.92} ${r * 0.92} 0 0 1 ${-r * 0.3} ${-r * 0.82}`}
            fill="none"
            stroke={light}
            strokeWidth={Math.max(2, r * 0.022)}
            strokeLinecap="round"
            opacity="0.5"
            aria-hidden="true"
          />
        </g>
      )}

      {ring && !isField ? (
        <g
          className="big-ring"
          transform="rotate(-18)"
          clipPath={`url(#vringf-${id})`}
          aria-hidden="true"
        >
          <ellipse
            rx={r * 1.9}
            ry={r * 0.46}
            fill="none"
            stroke={ringColor ?? light}
            strokeWidth={r * 0.13}
            opacity="0.9"
          />
          <ellipse
            rx={r * 1.9}
            ry={r * 0.46}
            fill="none"
            stroke={light}
            strokeWidth={r * 0.035}
            opacity="0.45"
          />
        </g>
      ) : null}

      {!isField && moons ? (
        <g className="big-moons">
          {moons.map((moon, i) => {
          const a = (moon.angle * Math.PI) / 180
          return (
            <g key={i} aria-hidden="true">
              <ellipse
                rx={moon.dist}
                ry={moon.dist * 0.5}
                fill="none"
                stroke={light}
                strokeWidth="1"
                strokeDasharray="2 7"
                opacity="0.18"
                transform={`rotate(${moon.angle - 90})`}
              />
              <circle
                cx={Math.cos(a) * moon.dist}
                cy={Math.sin(a) * moon.dist * 0.5}
                r={moon.r}
                fill={moon.color}
                stroke="#0A1020"
                strokeWidth="1.4"
              />
            </g>
          )
          })}
        </g>
      ) : null}

      {status === 'anomaly' || alert ? (
        <g className="big-signal" aria-hidden="true">
          <circle
            r={r + 20}
            fill="none"
            stroke="#FF8D7A"
            strokeWidth="2.2"
            strokeDasharray="4 9"
            opacity="0.9"
          />
          <circle r={r + 32} fill="none" stroke="#FF8D7A" strokeWidth="1" opacity="0.35" />
        </g>
      ) : null}
      </g>
    </g>
  )
}

function StationArt({ x, y, scale = 1, glow = false }: { x: number; y: number; scale?: number; glow?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      {glow ? <circle r="96" fill="url(#dock-glow)" /> : null}
      <ellipse cx="0" cy="10" rx="58" ry="16" fill="rgba(3,7,15,0.5)" />
      <g transform="rotate(-24)">
        <rect x="-40" y="-9" width="24" height="18" rx="3" fill="#2F4C74" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M-38 -6H-18M-38 0H-18M-38 6H-18" stroke="#7FA7CE" strokeWidth="1" opacity="0.7" />
        <rect x="16" y="-9" width="24" height="18" rx="3" fill="#2F4C74" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M18 -6H38M18 0H38M18 6H38" stroke="#7FA7CE" strokeWidth="1" opacity="0.7" />
        <rect x="-13" y="-11" width="26" height="22" rx="6" fill="#F7EED9" stroke="#0B1220" strokeWidth="2" />
        <circle r="5.4" fill="#FFD166" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M-13 -17V-11M13 -17V-11" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle r="44" fill="none" stroke="#F7EED9" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="2 6" />
    </g>
  )
}

function Ship({ color }: { color: string }) {
  return (
    <g className="ship-sprite">
      <path
        d="M0 -18C8 -10 9 1 5 11L0 15L-5 11C-9 1 -8 -10 0 -18Z"
        fill="#F7EED9"
        stroke="#1B2437"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M-5 7L-12 14L-5 13M5 7L12 14L5 13"
        fill={color}
        stroke="#1B2437"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M-3 14C-2 20 0 23 0 23C0 23 2 20 3 14" fill="#FFB84D" stroke="#1B2437" strokeWidth="1.6" />
      <circle cy="-4" r="4.6" fill="#D8F3FF" stroke="#1B2437" strokeWidth="2" />
      <circle cy="-4" r="1.5" fill="#1B2437" />
    </g>
  )
}

/* --------------------------------------------------------------------------
   A deterministic sky
   -------------------------------------------------------------------------- */

function makeStars() {
  let seed = 20261117
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  return Array.from({ length: 170 }, () => {
    const bright = rand()
    return {
      x: Number((rand() * 900).toFixed(1)),
      y: Number((rand() * 620).toFixed(1)),
      r: bright > 0.94 ? 2.1 : bright > 0.72 ? 1.15 : 0.6,
      o: Number((0.16 + bright * 0.55).toFixed(2)),
      flare: bright > 0.94,
    }
  })
}

const STARS = makeStars()

function Sky() {
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id="sky-neb-a">
          <stop offset="0%" stopColor="#6F86D6" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#6F86D6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sky-neb-b">
          <stop offset="0%" stopColor="#C77BA8" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#C77BA8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sky-neb-c">
          <stop offset="0%" stopColor="#63E6C3" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#63E6C3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dock-glow">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="90" rx="330" ry="230" fill="url(#sky-neb-a)" />
      <ellipse cx="790" cy="470" rx="300" ry="220" fill="url(#sky-neb-b)" />
      <ellipse cx="700" cy="70" rx="230" ry="160" fill="url(#sky-neb-c)" />

      {STARS.map((star, i) =>
        star.flare ? (
          <g key={i} opacity={star.o}>
            <circle cx={star.x} cy={star.y} r={star.r} fill="#F6F1E6" />
            <path
              d={`M ${star.x - 7} ${star.y} H ${star.x + 7} M ${star.x} ${star.y - 7} V ${star.y + 7}`}
              stroke="#F6F1E6"
              strokeWidth="0.7"
              opacity="0.55"
            />
          </g>
        ) : (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#E8E4DA" opacity={star.o} />
        ),
      )}
    </g>
  )
}

/* --------------------------------------------------------------------------
   The chart table
   -------------------------------------------------------------------------- */

const CANON = new Map(EXPEDITION.itinerary.map((id, index) => [id, index]))

function regionWorlds(topic: TopicId): Question[] {
  return topicQuestions(topic)
    .slice()
    .sort((a, b) => (CANON.get(a.id) ?? 99) - (CANON.get(b.id) ?? 99))
}

function ChartWorld({
  question,
  status,
  active,
  selected,
  onSelect,
}: {
  question: Question
  status: NodeStatus
  active: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const look = { ...lookOf(question.id), r: 13 }

  return (
    <button
      type="button"
      className={`cw cw--${status} ${active ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`${question.destination}, ${getTopic(question.topicId).name}, ${
        STATUS_LABEL[status]
      }${active ? ', current world' : ''}`}
      onClick={() => onSelect(question.id)}
    >
      <span className="cw-art">
        <svg viewBox="-32 -32 64 64" aria-hidden="true">
          <WorldArt look={look} id={`${question.id}-mini`} />
        </svg>
        {status === 'mastered' ? (
          <span className="cw-mark is-mastered">
            <StarIcon />
          </span>
        ) : status === 'charted' ? (
          <span className="cw-mark is-charted">
            <CheckIcon />
          </span>
        ) : status === 'anomaly' ? (
          <span className="cw-mark is-anomaly">
            <AnomalyIcon />
          </span>
        ) : null}
      </span>
      <span className="cw-text">
        <span className="cw-name">{question.destination}</span>
        <span className="cw-tag">{active ? 'you are here' : question.tag.toLowerCase()}</span>
      </span>
    </button>
  )
}

export function StarMap({
  state,
  flight,
  landingKey,
  motion,
  landing,
  onTrackAnomaly,
}: StarMapProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [prevId, setPrevId] = useState<string | null>(null)
  const lastActive = useRef(activeQuestionId(state))

  const progress = expeditionProgress(state)
  const activeId = activeQuestionId(state)
  const active = getQuestion(activeId)
  const activeTopic = getTopic(active.topicId)
  const atStation = state.phase === 'preflight'
  const atDebrief = state.phase === 'debrief'
  const junction = state.phase === 'junction' ? state.junction : null
  const preview = getQuestion(state.itinerary[0] ?? activeId)
  const dueIds = state.phase === 'underway' ? dueAnomalyIds(state) : []

  const selectedQuestion = selected ? getQuestion(selected) : null
  const selectedStatus = selected ? statusOf(state, selected) : null
  const selectedRecord = selected ? state.answers[selected] : undefined
  const selectedAnomaly = selected ? state.anomalies[selected] : undefined
  const selectedDue = selected ? isDue(state, selected) : false

  /* Remember the last world so it can fly past on the way to the next one. */
  useEffect(() => {
    if (lastActive.current === activeId) return
    const previous = lastActive.current
    lastActive.current = activeId
    setSelected(null)
    if (!motion) {
      setPrevId(null)
      return
    }
    setPrevId(previous)
    const timer = window.setTimeout(() => setPrevId(null), 720)
    return () => window.clearTimeout(timer)
  }, [activeId, motion])

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const travel = Boolean(flight) && motion && !atStation && !atDebrief && !junction

  const plate = atStation
    ? {
        kicker: 'EXPEDITION 001 · HOME DOCK',
        name: 'Meridian Station',
        sub: `Docked. First stop — ${preview.destination}.`,
      }
    : atDebrief
      ? {
          kicker: 'EXPEDITION COMPLETE',
          name: 'Meridian Station',
          sub: `${progress.known} of ${progress.total} worlds on the chart. The log is written.`,
        }
      : junction
        ? {
            kicker: 'ROUTE JUNCTION · PICK A LANE',
            name: 'Two ways through',
            sub: 'The Quiet Belt is calm. The Ion Storm is louder and worth more fuel.',
          }
        : {
            kicker: state.detour
              ? 'SIGNAL DETOUR'
              : `${activeTopic.name} · ${activeTopic.discipline}`,
            name: active.destination,
            sub:
              state.detour || state.phase === 'underway'
                ? state.detour
                  ? `${active.tag} · out of sequence, then back on the route`
                  : `${active.tag} · world ${Math.min(state.cursor + 1, state.itinerary.length)} of ${state.itinerary.length}`
                : active.tag,
          }

  return (
    <section className="deck" aria-labelledby="chart-heading">
      <header className="deck-head">
        <div className="deck-id">
          <CompassDoodle aria-hidden="true" />
          <div>
            <p className="deck-kicker">Observation deck · sheet 01</p>
            <h2 className="deck-title" id="chart-heading">
              The Near Universe
            </h2>
          </div>
        </div>
        <p className="deck-tally">
          <span>
            <b>{progress.known}</b> charted
          </span>
          <span className="deck-tally-dot" aria-hidden="true">
            ·
          </span>
          <span>
            <b>{progress.anomalies}</b> signal{progress.anomalies === 1 ? '' : 's'}
          </span>
        </p>
      </header>

      <div className={`viewport ${motion ? '' : 'is-still'}`}>
        <svg
          className="viewport-svg"
          viewBox="0 0 900 620"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <Sky />

          {atStation || atDebrief ? (
            <>
              <StationArt x={450} y={atDebrief ? 300 : 330} scale={atDebrief ? 2.3 : 1.9} glow />
              {atStation ? (
                <>
                  <BigWorld question={preview} status="uncharted" r={74} x={690} y={250} />
                  <path
                    d="M 300 392 Q 470 476 646 306"
                    fill="none"
                    stroke="#FFD166"
                    strokeWidth="1.6"
                    strokeDasharray="3 9"
                    opacity="0.45"
                  />
                  <g transform="translate(452 404) scale(1.05)">
                    <Ship color="#FFD166" />
                  </g>
                </>
              ) : (
                <g transform="translate(548 372) rotate(52) scale(1.15)">
                  <Ship color="#63E6C3" />
                </g>
              )}
            </>
          ) : junction ? (
            <>
              <path
                d="M 450 640 Q 380 470 268 398"
                fill="none"
                stroke="#63E6C3"
                strokeWidth="1.8"
                strokeDasharray="4 9"
                opacity="0.55"
              />
              <path
                d="M 450 640 Q 540 460 646 386"
                fill="none"
                stroke="#FF8D7A"
                strokeWidth="1.8"
                strokeDasharray="4 9"
                opacity="0.55"
              />
              <BigWorld
                question={getQuestion(junction.safeId)}
                status={statusOf(state, junction.safeId)}
                r={82}
                x={252}
                y={294}
              />
              <BigWorld
                question={getQuestion(junction.riskyId)}
                status={statusOf(state, junction.riskyId)}
                r={100}
                x={652}
                y={274}
              />
              <text x={252} y={430} textAnchor="middle" className="junc-name">
                {getQuestion(junction.safeId).destination}
              </text>
              <text x={252} y={454} textAnchor="middle" className="junc-sub">
                {ROUTES.safe.name} · calmer
              </text>
              <text x={652} y={418} textAnchor="middle" className="junc-name">
                {getQuestion(junction.riskyId).destination}
              </text>
              <text x={652} y={442} textAnchor="middle" className="junc-sub">
                {ROUTES.risky.name} · harder
              </text>
            </>
          ) : (
            <>
              {prevId && prevId !== activeId && travel ? (
                <BigWorld
                  key={`leaving-${prevId}`}
                  question={getQuestion(prevId)}
                  status={statusOf(state, prevId)}
                  r={186}
                  x={470}
                  y={300}
                  className="is-leaving"
                />
              ) : null}

              <BigWorld
                key={activeId}
                question={active}
                status={statusOf(state, activeId)}
                r={Math.round(158 + lookOf(activeId).r * 1.15)}
                x={470}
                y={298}
              />

              {landing && motion ? (
                <g key={`land-${landingKey}`} className="land-burst" transform="translate(470 298)">
                  <circle r="120" className="land-ring" stroke="#FFD166" />
                  <circle r="120" className="land-ring land-ring--late" stroke={activeTopic.hue} />
                </g>
              ) : null}

              {travel ? (
                <g key={`warp-${flight?.key}`} className="warp" aria-hidden="true">
                  {[86, 148, 214, 276, 338, 402, 468, 532].map((y, i) => (
                    <line
                      key={y}
                      x1={-160}
                      x2={1060}
                      y1={y}
                      y2={y}
                      style={{ animationDelay: `${i * 34}ms` }}
                    />
                  ))}
                </g>
              ) : null}
            </>
          )}
        </svg>

        <span className="rivet rivet--tl" aria-hidden="true" />
        <span className="rivet rivet--tr" aria-hidden="true" />
        <span className="rivet rivet--bl" aria-hidden="true" />
        <span className="rivet rivet--br" aria-hidden="true" />

        <div className="viewport-glare" aria-hidden="true" />

        <div className="deck-plate">
          <p className="plate-kicker">{plate.kicker}</p>
          <p className="plate-name">{plate.name}</p>
          <p className="plate-sub">{plate.sub}</p>
        </div>

        {dueIds.length > 0 ? (
          <button
            type="button"
            className="signal-lamp"
            onClick={() => onTrackAnomaly(dueIds[0])}
            aria-label={`Signal due. Track ${getQuestion(dueIds[0]).destination}.`}
          >
            <span className="signal-lamp-dot" aria-hidden="true" />
            Signal due
          </button>
        ) : null}
      </div>

      <div className="chart-paper">
        <div className="chart-top">
          <p className="chart-title">Nav chart</p>
          <p className="chart-progress">
            <b>{progress.known}</b>/{progress.total} charted
            <span aria-hidden="true"> · </span>
            <b>{progress.mastered}</b> mastered
          </p>
        </div>

        <div className="chart-grid">
          {Object.values(TOPICS).map((topic) => {
            const worlds = regionWorlds(topic.id)
            const known = worlds.filter((question) => {
              const status = statusOf(state, question.id)
              return status === 'mastered' || status === 'charted'
            }).length
            return (
              <div className="chart-region" key={topic.id}>
                <p className="chart-region-head">
                  <span className="chart-region-name">{topic.name}</span>
                  <span className="chart-region-count">{known}/3</span>
                </p>
                {worlds.map((question) => (
                  <ChartWorld
                    key={question.id}
                    question={question}
                    status={statusOf(state, question.id)}
                    active={question.id === activeId && state.phase === 'underway'}
                    selected={selected === question.id}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="deck-foot">
        <ul className="deck-keys" aria-label="Chart legend">
          <li className="deck-key deck-key--mastered">
            <StarIcon aria-hidden="true" />
            mastered <b>{progress.mastered}</b>
          </li>
          <li className="deck-key deck-key--charted">
            <CheckIcon aria-hidden="true" />
            charted <b>{progress.charted}</b>
          </li>
          <li className="deck-key deck-key--anomaly">
            <AnomalyIcon aria-hidden="true" />
            signals <b>{progress.anomalies}</b>
          </li>
          <li className="deck-key deck-key--uncharted">
            <span className="key-halo" aria-hidden="true" />
            uncharted <b>{Math.max(0, progress.total - progress.known - progress.anomalies)}</b>
          </li>
        </ul>
        <p className="deck-tip">
          <ScanIcon aria-hidden="true" /> Tap a world to look closer
        </p>
      </div>

      {selectedQuestion && selectedStatus ? (
        <aside className="world-card" aria-live="polite" aria-label="World card">
          <button
            type="button"
            className="world-card-close"
            onClick={() => setSelected(null)}
            aria-label="Close world card"
          >
            ×
          </button>
          <p className="world-card-kicker">
            {getTopic(selectedQuestion.topicId).name} · {selectedQuestion.tag}
          </p>
          <h3 className="world-card-title">{selectedQuestion.destination}</h3>
          <p className={`world-card-status is-${selectedStatus}`}>
            {selectedStatus === 'mastered' ? (
              <StarIcon aria-hidden="true" />
            ) : selectedStatus === 'charted' ? (
              <CheckIcon aria-hidden="true" />
            ) : selectedStatus === 'anomaly' ? (
              <AnomalyIcon aria-hidden="true" />
            ) : (
              <span className="status-dot" aria-hidden="true" />
            )}
            {STATUS_LABEL[selectedStatus]}
          </p>
          <p className="world-card-note">{statusSentence(selectedStatus)}</p>
          {selectedAnomaly ? (
            <p className="world-card-whisper">
              Returns in {Math.max(1, selectedAnomaly.dueAt - state.cursor)} world
              {Math.max(1, selectedAnomaly.dueAt - state.cursor) === 1 ? '' : 's'}.
            </p>
          ) : selectedRecord ? (
            <p className="world-card-whisper">
              Last sample: {selectedRecord.correct ? 'signal confirmed' : 'logged as a signal'} on
              attempt {selectedRecord.attempt}.
            </p>
          ) : null}
          {selectedDue && state.phase === 'underway' ? (
            <button
              type="button"
              className="btn btn--small btn--primary world-card-action"
              onClick={() => {
                onTrackAnomaly(selectedQuestion.id)
                setSelected(null)
              }}
            >
              Track this signal →
            </button>
          ) : null}
        </aside>
      ) : null}
    </section>
  )
}
