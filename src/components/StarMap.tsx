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

/** Soft, hand-drawn cloud bands laid over a world's surface. */
function Clouds({ r, light, id }: { r: number; light: string; id: string }) {
  const wisps = [
    { d: `M ${-r} ${-r * 0.24} Q ${-r * 0.4} ${-r * 0.42} ${r * 0.16} ${-r * 0.2} T ${r} ${-r * 0.3}`, w: 0.07, o: 0.3 },
    { d: `M ${-r} ${r * 0.06} Q ${-r * 0.24} ${r * 0.26} ${r * 0.42} ${r * 0.08} T ${r} ${r * 0.16}`, w: 0.05, o: 0.22 },
    { d: `M ${-r * 0.86} ${r * 0.44} Q ${-r * 0.2} ${r * 0.62} ${r * 0.6} ${r * 0.4}`, w: 0.035, o: 0.18 },
    { d: `M ${-r * 0.4} ${-r * 0.62} Q ${r * 0.1} ${-r * 0.5} ${r * 0.7} ${-r * 0.58}`, w: 0.03, o: 0.16 },
  ]
  return (
    <g clipPath={`url(#wclip-${id})`} className="big-clouds" aria-hidden="true">
      {wisps.map((wisp, i) => (
        <path
          key={i}
          d={wisp.d}
          fill="none"
          stroke={light}
          strokeWidth={Math.max(1.2, r * wisp.w)}
          strokeLinecap="round"
          opacity={wisp.o}
        />
      ))}
    </g>
  )
}

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
  const isOcean = kind === 'ocean'
  const cloudy = kind === 'banded' || kind === 'ocean' || kind === 'hazy' || kind === 'icy'
  const cities = [
    [0.28, 0.18, 1.3],
    [0.44, 0.34, 1.7],
    [0.34, 0.5, 1.1],
    [0.58, 0.16, 1.5],
    [0.66, 0.44, 1.2],
    [0.5, 0.62, 1.4],
    [0.72, 0.26, 0.9],
    [0.22, 0.4, 0.8],
  ]

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
        <radialGradient id={`vlimb-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="88%" stopColor={light} stopOpacity="0" />
          <stop offset="96%" stopColor={light} stopOpacity="0.32" />
          <stop offset="100%" stopColor={light} stopOpacity="0" />
        </radialGradient>
        {moons?.map((_, i) => (
          <radialGradient key={i} id={`mshade-${id}-${i}`} cx="32%" cy="28%" r="82%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="52%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.62" />
          </radialGradient>
        ))}
        <clipPath id={`wclip-${id}`}>
          <circle r={r} />
        </clipPath>
        <clipPath id={`vringf-${id}`}>
          <rect x={-r * 3} y={0} width={r * 6} height={r * 3} />
        </clipPath>
      </defs>

      <circle r={r * 1.5} fill={`url(#vglow-${id})`} aria-hidden="true" />
      {!isField ? (
        <circle r={r * 1.015} fill={`url(#vlimb-${id})`} aria-hidden="true" />
      ) : null}

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
          {cloudy ? <Clouds r={r} light={light} id={id} /> : null}

          {isOcean ? (
            <g clipPath={`url(#wclip-${id})`} aria-hidden="true">
              {cities.map(([cx, cy, s], i) => (
                <g key={i}>
                  <circle cx={r * cx} cy={r * cy} r={r * 0.045 * s} fill="#FFCF7A" opacity="0.14" />
                  <circle cx={r * cx} cy={r * cy} r={r * 0.016 * s} fill="#FFE6B8" opacity="0.8" />
                </g>
              ))}
            </g>
          ) : null}

          <circle r={r} fill={`url(#vshade-${id})`} aria-hidden="true" />

          {ring ? (
            <ellipse
              cx={0}
              cy={r * 0.04}
              rx={r * 1.22}
              ry={r * 0.2}
              fill="#04060D"
              opacity="0.22"
              transform="rotate(-18)"
              clipPath={`url(#wclip-${id})`}
              aria-hidden="true"
            />
          ) : null}

          {isOcean || kind === 'metallic' ? (
            <g clipPath={`url(#wclip-${id})`} aria-hidden="true">
              <ellipse
                cx={-r * 0.44}
                cy={-r * 0.46}
                rx={r * 0.3}
                ry={r * 0.15}
                fill="#FFFFFF"
                opacity="0.16"
                transform="rotate(-28)"
              />
              <ellipse
                cx={-r * 0.48}
                cy={-r * 0.5}
                rx={r * 0.09}
                ry={r * 0.045}
                fill="#FFFFFF"
                opacity="0.4"
                transform="rotate(-28)"
              />
            </g>
          ) : null}

          <circle
            r={r}
            fill="none"
            stroke={light}
            strokeOpacity="0.24"
            strokeWidth="1.4"
            aria-hidden="true"
          />
          <circle
            r={r * 0.985}
            fill="none"
            stroke={light}
            strokeOpacity="0.16"
            strokeWidth={Math.max(1.5, r * 0.045)}
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

      {!isField ? (
        <g className="lens-flare" aria-hidden="true">
          <circle cx={-r * 0.86} cy={-r * 0.74} r={r * 0.055} fill={light} opacity="0.22" />
          <circle cx={-r * 1.1} cy={-r * 0.92} r={r * 0.11} fill={light} opacity="0.07" />
          <circle cx={-r * 0.62} cy={-r * 0.56} r={r * 0.035} fill={light} opacity="0.14" />
        </g>
      ) : null}

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
            const mx = Math.cos(a) * moon.dist
            const my = Math.sin(a) * moon.dist * 0.5
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
                <circle cx={mx} cy={my} r={moon.r * 2.4} fill={moon.color} opacity="0.08" />
                <circle
                  cx={mx}
                  cy={my}
                  r={moon.r}
                  fill={moon.color}
                  stroke="#0A1020"
                  strokeWidth="1.3"
                />
                <circle
                  cx={mx}
                  cy={my}
                  r={moon.r}
                  fill={`url(#mshade-${id}-${i})`}
                  stroke="none"
                />
                <path
                  d={`M ${mx - moon.r * 0.5} ${my - moon.r * 0.62} a ${moon.r} ${moon.r} 0 0 1 ${moon.r * 0.5} ${moon.r * 0.2}`}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                  strokeLinecap="round"
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
        <path d="M0 -17V-29" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" />
        <circle cy="-31" r="2.6" fill="#FF8D7A" className="station-beacon" stroke="#0B1220" strokeWidth="1" />
        <path d="M0 11V22" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" />
        <circle cy="24" r="2" fill="#63E6C3" className="station-beacon station-beacon--late" stroke="#0B1220" strokeWidth="1" />
        <path d="M-56 -4H-40M40 -4H56" stroke="#7FA7CE" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
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

interface Star {
  x: number
  y: number
  r: number
  o: number
}

function makeStars(seed: number, count: number, size: number, dim: number): Star[] {
  let state = seed
  const rand = () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
  return Array.from({ length: count }, () => {
    const bright = rand()
    return {
      x: Number((-60 + rand() * 1020).toFixed(1)),
      y: Number((-60 + rand() * 740).toFixed(1)),
      r: Number((size * (0.6 + bright * 1.1)).toFixed(2)),
      o: Number((dim + bright * 0.55).toFixed(2)),
    }
  })
}

/* Three depths of sky so the pane reads as a volume, not a backdrop. */
const SKY_FAR = makeStars(1977, 260, 0.9, 0.14)
const SKY_MID = makeStars(4231, 120, 1.25, 0.22)
const SKY_NEAR = makeStars(8123, 34, 1.9, 0.4)

function Sky() {
  return (
    <g aria-hidden="true">
      <defs>
        <radialGradient id="sky-base" cx="50%" cy="46%" r="76%">
          <stop offset="0%" stopColor="#0B1526" />
          <stop offset="58%" stopColor="#070D19" />
          <stop offset="100%" stopColor="#03060D" />
        </radialGradient>
        <radialGradient id="sky-neb-a">
          <stop offset="0%" stopColor="#6F86D6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6F86D6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sky-neb-b">
          <stop offset="0%" stopColor="#C77BA8" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#C77BA8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sky-neb-c">
          <stop offset="0%" stopColor="#63E6C3" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#63E6C3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8FA6D9" stopOpacity="0" />
          <stop offset="42%" stopColor="#CFD8F2" stopOpacity="0.13" />
          <stop offset="65%" stopColor="#E7D6E8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#8FA6D9" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="dock-glow">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="-60" y="-60" width="1020" height="740" fill="url(#sky-base)" />

      <g className="sky-band">
        <ellipse
          cx="520"
          cy="330"
          rx="620"
          ry="150"
          fill="url(#sky-band)"
          transform="rotate(-27 520 330)"
        />
      </g>

      <g className="sky-far">
        <ellipse cx="120" cy="70" rx="340" ry="240" fill="url(#sky-neb-a)" />
        <ellipse cx="800" cy="500" rx="320" ry="230" fill="url(#sky-neb-b)" />
        {SKY_FAR.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#DDE6F5" opacity={star.o} />
        ))}
      </g>

      <g className="sky-mid">
        <ellipse cx="710" cy="90" rx="250" ry="170" fill="url(#sky-neb-c)" />
        {SKY_MID.map((star, i) => (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#F2EEE4" opacity={star.o} />
        ))}
      </g>

      <g className="sky-near">
        {SKY_NEAR.map((star, i) =>
          i % 4 === 0 ? (
            <g key={i} opacity={star.o}>
              <circle cx={star.x} cy={star.y} r={star.r * 0.8} fill="#FFFFFF" />
              <path
                d={`M ${star.x - 8} ${star.y} H ${star.x + 8} M ${star.x} ${star.y - 8} V ${star.y + 8}`}
                stroke="#FFFFFF"
                strokeWidth="0.6"
                opacity="0.55"
              />
            </g>
          ) : (
            <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#FFF8EA" opacity={star.o} />
          ),
        )}
      </g>

      {/* A single slow satellite crossing the pane keeps the sky alive. */}
      <g className="sky-satellite">
        <path d="M 0 0 L 26 0" stroke="#F3ECDC" strokeWidth="1" opacity="0.32" />
        <circle cx="26" cy="0" r="1.5" fill="#FFD166" />
      </g>
    </g>
  )
}

/* --------------------------------------------------------------------------
   The cockpit: canopy frame, cowl, rivets
   -------------------------------------------------------------------------- */

const OPENING =
  'M 104 880 L 104 320 C 104 222 170 140 300 118 C 380 104 620 104 700 118 C 830 140 896 222 896 320 L 896 880 Q 500 922 104 880 Z'

function CockpitFrame() {
  return (
    <g className="cockpit-frame" aria-hidden="true">
      <defs>
        <linearGradient id="frame-brass" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#EBD49B" />
          <stop offset="20%" stopColor="#C4A667" />
          <stop offset="46%" stopColor="#937B45" />
          <stop offset="70%" stopColor="#6B5530" />
          <stop offset="88%" stopColor="#4B3A1E" />
          <stop offset="100%" stopColor="#33270F" />
        </linearGradient>
        <linearGradient id="frame-shadow" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#0A0703" stopOpacity="0.42" />
          <stop offset="38%" stopColor="#0A0703" stopOpacity="0" />
          <stop offset="72%" stopColor="#0A0703" stopOpacity="0" />
          <stop offset="100%" stopColor="#0A0703" stopOpacity="0.5" />
        </linearGradient>
        <clipPath id="frame-clip">
          <path
            d={`M -40 -40 H 1040 V 1040 H -40 Z ${OPENING}`}
            fillRule="evenodd"
          />
        </clipPath>
        <linearGradient id="frame-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF6D8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF6D8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="frame-rivet" cx="34%" cy="28%" r="76%">
          <stop offset="0%" stopColor="#FFF3CB" />
          <stop offset="40%" stopColor="#C8A96A" />
          <stop offset="100%" stopColor="#42310F" />
        </radialGradient>
        <linearGradient id="cowl-leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B2B19" />
          <stop offset="45%" stopColor="#241A10" />
          <stop offset="100%" stopColor="#0E0905" />
        </linearGradient>
        <linearGradient id="cowl-rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D8BE85" />
          <stop offset="55%" stopColor="#8A7040" />
          <stop offset="100%" stopColor="#4A3A1C" />
        </linearGradient>
      </defs>

      {/* The frame plate, with the canopy cut out of it. */}
      <path
        d={`M -40 -40 H 1040 V 1040 H -40 Z ${OPENING}`}
        fillRule="evenodd"
        fill="url(#frame-brass)"
        stroke="#150F07"
        strokeWidth="2.5"
      />

      <g clipPath="url(#frame-clip)">
        <rect x="-40" y="-40" width="1080" height="1080" fill="url(#frame-shadow)" />
      </g>

      {/* Leather glare shield along the bottom of the glass. */}
      <path
        d="M -40 888 Q 500 934 1040 888 L 1040 1040 L -40 1040 Z"
        fill="url(#cowl-leather)"
        stroke="#150F07"
        strokeWidth="2"
      />
      <path
        d="M -40 892 Q 500 938 1040 892"
        fill="none"
        stroke="rgba(214, 186, 128, 0.5)"
        strokeWidth="2"
      />
      <path
        d="M 26 910 Q 500 958 974 910"
        fill="none"
        stroke="rgba(247, 236, 215, 0.16)"
        strokeWidth="1.4"
        strokeDasharray="6 7"
      />

      {/* Vents and a switch bank on the cowl. */}
      <g stroke="rgba(247, 236, 215, 0.18)" strokeWidth="2" strokeLinecap="round">
        <path d="M 790 918 h 38 M 790 926 h 38 M 790 934 h 38" />
        <path d="M 846 918 h 24 M 846 926 h 24 M 846 934 h 24" />
      </g>
      <g>
        <rect x="720" y="914" width="9" height="24" rx="2" fill="#0F0A05" stroke="#7A6134" strokeWidth="1" />
        <rect x="720" y="908" width="9" height="8" rx="2" fill="#E3C383" stroke="#150F07" strokeWidth="1" />
        <rect x="742" y="914" width="9" height="24" rx="2" fill="#0F0A05" stroke="#7A6134" strokeWidth="1" />
        <rect x="742" y="908" width="9" height="8" rx="2" fill="#FF8D7A" stroke="#150F07" strokeWidth="1" />
      </g>

      {/* Inner bevel + highlight along the glass edge. */}
      <path d={OPENING} fill="none" stroke="#070A11" strokeWidth="44" opacity="0.28" />
      <path d={OPENING} fill="none" stroke="#070A11" strokeWidth="18" opacity="0.66" />
      <path d={OPENING} fill="none" stroke="#F8E6B7" strokeWidth="2" opacity="0.45" />

      {/* Instrument strip along the canopy bow. */}
      <g>
        <rect
          x="332"
          y="20"
          width="336"
          height="48"
          rx="9"
          fill="rgba(13, 10, 5, 0.58)"
          stroke="rgba(255, 244, 208, 0.22)"
          strokeWidth="1.2"
        />
        <path
          d="M 350 38 h 44 M 350 50 h 62 M 350 58 h 30"
          stroke="rgba(255, 244, 208, 0.26)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <g>
          <circle cx="592" cy="34" r="3.6" fill="#63E6C3" opacity="0.9" />
          <circle cx="608" cy="34" r="3.6" fill="#FFD166" opacity="0.9" />
          <circle cx="624" cy="34" r="3.6" fill="#FF8D7A" opacity="0.9" />
          <circle cx="642" cy="34" r="3.6" fill="rgba(255, 244, 208, 0.32)" />
        </g>
        <path
          d="M 572 50 h 72"
          stroke="rgba(255, 244, 208, 0.2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Brushed-metal grain down the pillars. */}
      <g stroke="rgba(255, 244, 208, 0.14)" strokeWidth="1" fill="none">
        <path d="M 22 930 C 20 760 24 480 52 330" />
        <path d="M 58 950 C 54 760 56 460 78 280" />
        <path d="M 978 930 C 980 760 976 480 948 330" />
        <path d="M 942 950 C 946 760 944 460 922 280" />
        <path d="M 180 40 C 360 8 640 8 820 40" />
      </g>

      {/* Canopy bow: a raised rib over the top of the glass. */}
      <path
        d="M 286 128 C 386 100 614 100 714 128"
        fill="none"
        stroke="url(#cowl-rail)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 286 125 C 386 97 614 97 714 125"
        fill="none"
        stroke="rgba(255, 246, 216, 0.4)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Canopy latch on the bow. */}
      <g transform="translate(500 118)">
        <rect x="-15" y="-7" width="30" height="14" rx="3" fill="#1A1208" stroke="#8C7340" strokeWidth="1.2" />
        <rect x="-9" y="-3" width="18" height="6" rx="2" fill="#E3C383" stroke="#150F07" strokeWidth="0.8" />
      </g>

      {/* Rivets along the frame. */}
      {[
        [104, 880],
        [168, 96],
        [330, 74],
        [500, 68],
        [670, 74],
        [832, 96],
        [896, 880],
        [58, 360],
        [58, 540],
        [58, 720],
        [942, 360],
        [942, 540],
        [942, 720],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="9" fill="url(#frame-rivet)" stroke="#150F07" strokeWidth="1.4" />
          <circle cx={cx - 2.4} cy={cy - 2.8} r="2" fill="#FFF6D9" opacity="0.7" />
        </g>
      ))}

      {/* Glass scratches and dust caught in the pane. */}
      <g fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M 252 646 q 46 -26 96 -32" />
        <path d="M 664 296 q 30 16 40 44" />
        <path d="M 522 800 q 62 22 122 6" />
        <path d="M 306 214 q 26 -10 54 -8" />
      </g>
      <g fill="rgba(255, 255, 255, 0.16)">
        <circle cx="612" cy="642" r="1.6" />
        <circle cx="366" cy="422" r="1.2" />
        <circle cx="700" cy="482" r="1.1" />
      </g>

      {/* Pillar grips. */}
      {[52, 948].map((gx) => (
        <g key={gx} transform={`translate(${gx} 620)`}>
          <rect
            x="-15"
            y="-58"
            width="30"
            height="116"
            rx="13"
            fill="#241A10"
            stroke="#0F0A05"
            strokeWidth="2"
          />
          <path d="M -6 -34 v 68" stroke="rgba(255, 244, 208, 0.22)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="0" cy="-46" r="3.6" fill="#C8A96A" stroke="#0F0A05" strokeWidth="0.8" />
          <circle cx="0" cy="46" r="3.6" fill="#C8A96A" stroke="#0F0A05" strokeWidth="0.8" />
        </g>
      ))}

      {/* Top gloss raking across the metal. */}
      <path
        d="M 100 340 C 100 222 178 136 318 112 C 400 96 600 96 682 112 C 822 136 900 222 900 340"
        fill="none"
        stroke="url(#frame-gloss)"
        strokeWidth="14"
        opacity="0.6"
      />
    </g>
  )
}

/* --------------------------------------------------------------------------
   Instruments over the glass
   -------------------------------------------------------------------------- */

function CockpitHud({ swept, r }: { swept: boolean; r: number }) {
  const cx = 470
  const cy = 298
  const s = r + 30
  const brackets = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]

  return (
    <g className="hud" aria-hidden="true">
      <defs>
        <linearGradient id="hud-sweep-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFD166" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={s}
        fill="none"
        stroke="rgba(255, 209, 102, 0.2)"
        strokeWidth="1"
        strokeDasharray="3 11"
      />
      <circle cx={cx} cy={cy} r={s + 14} fill="none" stroke="rgba(243, 236, 220, 0.08)" strokeWidth="1" />

      {brackets.map(([sx, sy], i) => {
        const bx = cx + sx * s * 0.72
        const by = cy + sy * s * 0.72
        const len = 20
        return (
          <path
            key={i}
            d={`M ${bx + sx * len} ${by} L ${bx + sx * len * 0.2} ${by} M ${bx} ${by + sy * len} L ${bx} ${by + sy * len * 0.2}`}
            fill="none"
            stroke="rgba(255, 209, 102, 0.52)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )
      })}

      <path
        d={`M ${cx - 8} ${cy} h 6 M ${cx + 2} ${cy} h 6 M ${cx} ${cy - 8} v 6 M ${cx} ${cy + 2} v 6`}
        stroke="rgba(243, 236, 220, 0.32)"
        strokeWidth="1"
      />

      {swept ? (
        <>
          <g className="hud-sweep">
            <path
              d={`M ${cx} ${cy} L ${cx + s * 0.98} ${cy - s * 0.18} A ${s} ${s} 0 0 1 ${cx + s * 0.98} ${cy + s * 0.02} Z`}
              fill="url(#hud-sweep-grad)"
            />
            <path
              d={`M ${cx} ${cy} L ${cx + s * 0.98} ${cy - s * 0.18}`}
              stroke="rgba(255, 209, 102, 0.5)"
              strokeWidth="1.4"
            />
            <circle
              cx={cx}
              cy={cy}
              r={s}
              fill="none"
              stroke="rgba(255, 209, 102, 0.45)"
              strokeWidth="2.4"
              strokeDasharray="64 520"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : null}
    </g>
  )
}

function Warp({ cx, cy }: { cx: number; cy: number }) {
  const rays = Array.from({ length: 34 }, (_, i) => {
    const a = (i / 34) * Math.PI * 2 + 0.17
    const inner = 80 + (i % 4) * 14
    const outer = 340 + (i % 6) * 32
    return {
      x1: Number((cx + Math.cos(a) * inner).toFixed(1)),
      y1: Number((cy + Math.sin(a) * inner * 0.92).toFixed(1)),
      x2: Number((cx + Math.cos(a) * outer).toFixed(1)),
      y2: Number((cy + Math.sin(a) * outer * 0.92).toFixed(1)),
      delay: (i % 7) * 24,
    }
  })

  return (
    <g className="warp" aria-hidden="true">
      <circle className="warp-core" cx={cx} cy={cy} r="44" fill="none" stroke="#FFD166" />
      {rays.map((ray, i) => (
        <line
          key={i}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          style={{ animationDelay: `${ray.delay}ms` }}
        />
      ))}
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

  const activeIndex = CANON.get(activeId) ?? 0
  const heading = String((activeIndex * 29 + 14) % 360).padStart(3, '0')
  const range = (0.42 + activeIndex * 0.068).toFixed(2)
  const signal =
    dueIds.length > 0 ? `${dueIds.length} DUE` : state.anomalies[activeId] ? 'ANOMALY' : 'CLEAR'
  const answered = state.answers[activeId]
  const hinted = state.phase === 'underway' && !answered && state.hints.includes(activeId)
  const worldR = Math.round(158 + lookOf(activeId).r * 1.15)

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

      <div
        className={`viewport ${motion ? '' : 'is-still'} ${travel ? 'is-travelling' : ''} ${
          landing && motion ? 'is-landing' : ''
        }`}
      >
        <svg
          className="viewport-svg"
          viewBox="0 0 900 620"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <Sky />
          <g className="scene-drift">
            <g className="scene-shake">

          {atStation || atDebrief ? (
            <>
              <StationArt x={430} y={atDebrief ? 306 : 330} scale={atDebrief ? 2.55 : 1.9} glow />
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
                <>
                  <BigWorld
                    question={getQuestion(state.itinerary[state.itinerary.length - 1] ?? activeId)}
                    status={statusOf(state, state.itinerary[state.itinerary.length - 1] ?? activeId)}
                    r={64}
                    x={722}
                    y={236}
                  />
                  <path
                    d="M 486 400 Q 600 440 668 288"
                    fill="none"
                    stroke="#63E6C3"
                    strokeWidth="1.6"
                    strokeDasharray="3 9"
                    opacity="0.4"
                  />
                  <g transform="translate(548 372) rotate(52) scale(1.15)">
                    <Ship color="#63E6C3" />
                  </g>
                </>
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
              <text x={252} y={418} textAnchor="middle" className="junc-name">
                {getQuestion(junction.safeId).destination}
              </text>
              <text x={252} y={440} textAnchor="middle" className="junc-sub">
                {ROUTES.safe.name} · calmer
              </text>
              <text x={652} y={404} textAnchor="middle" className="junc-name">
                {getQuestion(junction.riskyId).destination}
              </text>
              <text x={652} y={426} textAnchor="middle" className="junc-sub">
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

              {travel ? <Warp key={`warp-${flight?.key}`} cx={470} cy={298} /> : null}
            </>
          )}
            </g>
          </g>

          {state.phase === 'underway' && !junction ? (
            <CockpitHud swept={Boolean(hinted)} r={worldR} />
          ) : null}
        </svg>

        <svg
          className="viewport-frame"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <CockpitFrame />
        </svg>

        <div className="viewport-glare" aria-hidden="true" />

        {state.phase === 'underway' && !junction ? (
          <>
            <div className="hud-tape" aria-hidden="true">
              <span className="hud-tape-ticks" />
              <span className="hud-tape-mark" />
              <span className="hud-tape-text">HDG {heading}° · V 12.4</span>
            </div>
            {hinted ? (
              <div className="hud-scan" aria-hidden="true">
                Deep scan · eliminating
              </div>
            ) : null}
            <div className="hud-telemetry" aria-hidden="true">
              <p>RNG {range} AU</p>
              <p>SIG {signal}</p>
              <p className="is-dim">HULL NOMINAL</p>
            </div>
          </>
        ) : null}

        {answered && state.phase === 'underway' ? (
          <p
            key={`stamp-${activeId}-${answered.attempt}`}
            className={`hud-stamp ${answered.correct ? 'is-ok' : 'is-bad'}`}
            aria-hidden="true"
          >
            {answered.correct ? 'SURVEY VERIFIED' : 'SIGNAL LOGGED'}
          </p>
        ) : null}

        {answered && !answered.correct && state.phase === 'underway' ? (
          <span
            key={`glitch-${activeId}-${answered.attempt}`}
            className="hud-interference"
            aria-hidden="true"
          />
        ) : null}

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
