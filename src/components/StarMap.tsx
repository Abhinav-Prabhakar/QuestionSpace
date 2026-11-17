import { useEffect, useState } from 'react'
import {
  QUESTIONS,
  STATION,
  TOPICS,
  getQuestion,
  getTopic,
  topicQuestions,
  type Question,
  type TopicId,
} from '../data/expedition'
import {
  activeQuestionId,
  expeditionProgress,
  isDue,
  statusOf,
  type ExpeditionState,
  type NodeStatus,
} from '../lib/session'
import { flightArc, sketchLine, type Point } from '../lib/geometry'
import { StarField } from './StarField'
import {
  AnomalyIcon,
  CheckIcon,
  CompassDoodle,
  ScanIcon,
  StarIcon,
} from './Icons'

export interface Flight {
  from: Point
  to: Point
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
  if (status === 'charted') return 'Came back from a signal and settled into the map.'
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
  /** Where the name sits relative to the world. */
  labelSide?: 'below' | 'above' | 'right' | 'left'
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
    labelSide: 'right',
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
    labelSide: 'above',
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
    labelSide: 'above',
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

const REGION_LABEL: Record<TopicId, { x: number; y: number }> = {
  messenger: { x: 232, y: 136 },
  daedalus: { x: 768, y: 136 },
  hubble: { x: 232, y: 512 },
  galileo: { x: 768, y: 576 },
}

function lookOf(id: string): WorldLook {
  return LOOKS[id] ?? { r: 24, base: '#9BA8C0', deep: '#3A465E', light: '#E4EBF7', kind: 'rocky' }
}

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
          strokeWidth="1.4"
          opacity="0.45"
          strokeLinecap="round"
        />
        <path
          d={`M ${-r * 0.2} ${-r * 0.75} Q ${r * 0.1} ${-r * 0.1} ${r * 0.7} ${r * 0.3}`}
          fill="none"
          stroke={deep}
          strokeWidth="1.2"
          opacity="0.4"
          strokeLinecap="round"
        />
        <path
          d={`M ${-r * 0.7} ${r * 0.35} Q ${-r * 0.2} ${r * 0.5} ${r * 0.25} ${r * 0.78}`}
          fill="none"
          stroke={deep}
          strokeWidth="1.1"
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
            strokeWidth="1.3"
            opacity="0.55"
          />
          <path
            d={`M ${-r * 1.2} 0 C ${-r * 0.55} ${-r * 0.72} ${r * 0.55} ${r * 0.74} ${r * 1.2} 0`}
            fill="none"
            stroke={light}
            strokeWidth="2.4"
            opacity="0.75"
            strokeLinecap="round"
          />
          <path
            d={`M ${-r * 1.2} 0 C ${-r * 0.42} ${r * 0.62} ${r * 0.46} ${-r * 0.68} ${r * 1.2} 0`}
            fill="none"
            stroke={base}
            strokeWidth="2.2"
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
          strokeWidth="1.1"
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
  const isGalaxy = kind === 'galaxy'
  const isCluster = kind === 'cluster' || kind === 'deepfield'

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

      {isGalaxy || isCluster ? (
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

      {ring ? (
        <g transform="rotate(-19)" aria-hidden="true">
          <path
            d={`M ${-r * 1.78} 0 A ${r * 1.78} ${r * 0.46} 0 0 0 ${r * 1.78} 0`}
            fill="none"
            stroke={ringColor ?? light}
            strokeWidth={r * 0.15}
            opacity="0.72"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {look.moons?.map((moon, i) => {
        const a = (moon.angle * Math.PI) / 180
        return (
          <g key={i} aria-hidden="true">
            <ellipse
              cx={0}
              cy={0}
              rx={moon.dist}
              ry={moon.dist * 0.52}
              fill="none"
              stroke={light}
              strokeWidth="0.8"
              strokeDasharray="1 4"
              opacity="0.22"
              transform={`rotate(${moon.angle - 90})`}
            />
            <circle
              cx={Math.cos(a) * moon.dist}
              cy={Math.sin(a) * moon.dist * 0.52}
              r={moon.r}
              fill={moon.color}
              stroke="#0A1020"
              strokeWidth="0.9"
            />
          </g>
        )
      })}
    </g>
  )
}

function Sticker({ status, r }: { status: NodeStatus; r: number }) {
  if (status === 'mastered') {
    return (
      <g className="world-sticker" transform={`translate(${r * 0.72} ${-r * 0.78}) rotate(9)`} aria-hidden="true">
        <circle r="9" fill="#FFD166" stroke="#1B2437" strokeWidth="1.8" />
        <path
          d="M0 -4.6 L1.5 -1.3 L5 -1.1 L2.3 1.2 L3.2 4.6 L0 2.7 L-3.2 4.6 L-2.3 1.2 L-5 -1.1 L-1.5 -1.3 Z"
          fill="#1B2437"
        />
      </g>
    )
  }
  if (status === 'charted') {
    return (
      <g className="world-sticker" transform={`translate(${r * 0.72} ${-r * 0.78}) rotate(7)`} aria-hidden="true">
        <circle r="8.5" fill="#63E6C3" stroke="#1B2437" strokeWidth="1.7" />
        <path
          d="M-3.4 0.2 L-1 2.6 L3.6 -2.4"
          fill="none"
          stroke="#123028"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    )
  }
  return null
}

function WorldMark({
  question,
  status,
  isActive,
  selected,
  onSelect,
}: {
  question: Question
  status: NodeStatus
  isActive: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const look = lookOf(question.id)
  const r = look.r
  const side = look.labelSide ?? 'below'
  const labelX = side === 'right' ? r + 10 : side === 'left' ? -(r + 10) : 0
  const labelY =
    side === 'above' ? -(r + 16) : side === 'right' || side === 'left' ? 6 : r + 24
  const anchor = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle'
  const tagY = side === 'above' ? labelY - 14 : labelY + 16
  const showTag = isActive || selected

  return (
    <g
      className={`world world--${status} ${isActive ? 'is-active' : ''} ${
        selected ? 'is-selected' : ''
      }`}
      transform={`translate(${question.map.x} ${question.map.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${question.destination}, ${question.tag}, ${getTopic(question.topicId).name}. ${STATUS_LABEL[status]}${
        isActive ? ', current world' : ''
      }.`}
      aria-pressed={selected}
      onClick={() => onSelect(question.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(question.id)
        }
      }}
    >
      <circle className="world-hit" r={Math.max(48, r + 26)} />
      <circle className="world-focus" r={r + 14} />

      {isActive ? (
        <g className="world-orbit" aria-hidden="true">
          <ellipse
            rx={r + 22}
            ry={r * 0.52}
            transform="rotate(-16)"
            fill="none"
            stroke="#FFD166"
            strokeWidth="1.8"
            strokeDasharray="3 6"
          />
        </g>
      ) : null}

      {status === 'anomaly' ? (
        <g className="world-signal" aria-hidden="true">
          <circle r={r + 9} fill="none" stroke="#FF8D7A" strokeWidth="1.7" strokeDasharray="2.5 4" />
          <circle r={r + 16} fill="none" stroke="#FF8D7A" strokeWidth="1" opacity="0.5" />
        </g>
      ) : null}

      {status === 'uncharted' ? (
        <circle
          className="world-halo"
          r={r + 8}
          fill="none"
          stroke="#8C99B2"
          strokeWidth="1.1"
          strokeDasharray="2 5"
          opacity="0.55"
          aria-hidden="true"
        />
      ) : null}

      <WorldArt look={look} id={question.id} />
      <Sticker status={status} r={r} />

      <text
        x={labelX}
        y={labelY}
        textAnchor={anchor}
        className={`world-label ${isActive ? 'is-active' : ''}`}
      >
        {question.destination}
      </text>
      {showTag ? (
        <text x={labelX} y={tagY} textAnchor={anchor} className="world-tagline">
          {isActive ? 'you are here' : question.tag.toLowerCase()}
        </text>
      ) : null}
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

function Station() {
  return (
    <g className="station" transform={`translate(${STATION.x} ${STATION.y})`} aria-hidden="true">
      <ellipse cx="0" cy="8" rx="56" ry="17" fill="rgba(10,15,28,0.55)" />
      <g transform="rotate(-28)">
        <rect x="-40" y="-9" width="24" height="18" rx="3" fill="#2F4C74" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M-38 -6H-18M-38 0H-18M-38 6H-18" stroke="#7FA7CE" strokeWidth="1" opacity="0.7" />
        <rect x="16" y="-9" width="24" height="18" rx="3" fill="#2F4C74" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M18 -6H38M18 0H38M18 6H38" stroke="#7FA7CE" strokeWidth="1" opacity="0.7" />
        <rect x="-13" y="-11" width="26" height="22" rx="6" fill="#F7EED9" stroke="#0B1220" strokeWidth="2" />
        <circle r="5.4" fill="#FFD166" stroke="#0B1220" strokeWidth="1.4" />
        <path d="M-13 -17V-11M13 -17V-11" stroke="#0B1220" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle r="44" fill="none" stroke="#F7EED9" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="2 6" />
      <text y="-58" textAnchor="middle" className="station-label">
        Meridian Station
      </text>
      <text y="64" textAnchor="middle" className="station-sub">
        home dock
      </text>
    </g>
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
  const progress = expeditionProgress(state)
  const activeId = activeQuestionId(state)
  const active = getQuestion(activeId)
  const activeTopic = getTopic(active.topicId)
  const atStation = state.phase === 'preflight'
  const selectedQuestion = selected ? getQuestion(selected) : null
  const selectedStatus = selected ? statusOf(state, selected) : null
  const selectedRecord = selected ? state.answers[selected] : undefined
  const selectedAnomaly = selected ? state.anomalies[selected] : undefined
  const selectedDue = selected ? isDue(state, selected) : false

  const shipRest: Point = atStation ? STATION : flight ? flight.to : active.map
  const shipLift = atStation ? 34 : lookOf(active.id).r + 26

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <section className="atlas" aria-labelledby="chart-heading">
      <div className="atlas-sky" aria-hidden="true" />

      <header className="atlas-head">
        <div>
          <p className="atlas-kicker">
            <CompassDoodle aria-hidden="true" /> Chart no. 001
          </p>
          <h2 className="atlas-title" id="chart-heading">
            The Near Universe
          </h2>
          <p className="atlas-sub">Twelve worlds, four constellations, one little ship.</p>
        </div>
        <p className="atlas-tally">
          <span>
            <b>{progress.mastered + progress.charted}</b> charted
          </span>
          <span className="atlas-tally-dot" aria-hidden="true">
            ·
          </span>
          <span>
            <b>{progress.anomalies}</b> signals
          </span>
        </p>
      </header>

      <svg
        className="atlas-svg"
        viewBox="0 0 1000 1000"
        role="img"
        aria-labelledby="chart-title chart-desc"
      >
        <title id="chart-title">Illustrated atlas of the Near Universe</title>
        <desc id="chart-desc">
          {progress.mastered} worlds mastered, {progress.charted} recovered from a signal,{' '}
          {progress.anomalies} signals still unresolved. The ship is at{' '}
          {atStation ? 'Meridian Station' : active.destination}.
        </desc>

        <StarField />

        {/* Broad pencil orbits, drawn behind the worlds. */}
        <g className="atlas-orbits" aria-hidden="true">
          <path
            d="M 70 470 C 240 300 700 250 930 430"
            fill="none"
            stroke="rgba(243,236,220,0.09)"
            strokeWidth="1.4"
            strokeDasharray="2 11"
          />
          <path
            d="M 90 590 C 300 760 690 800 920 600"
            fill="none"
            stroke="rgba(243,236,220,0.08)"
            strokeWidth="1.4"
            strokeDasharray="2 11"
          />
          <path
            d="M 470 70 C 330 330 320 660 500 930"
            fill="none"
            stroke="rgba(255,209,102,0.07)"
            strokeWidth="1.2"
            strokeDasharray="1 13"
          />
        </g>

        {/* A comet wandering through the empty quarter. */}
        <g className="atlas-comet" transform="translate(628 292) rotate(16)" aria-hidden="true">
          <path
            d="M 7 -3 L 62 -16 M 7 1 L 50 11 M 5 -6 L 42 -30"
            stroke="rgba(243,236,220,0.3)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle r="4.6" fill="#F3ECDC" opacity="0.85" />
          <circle r="9" fill="none" stroke="rgba(243,236,220,0.25)" strokeWidth="1" />
        </g>

        {/* Each constellation is a faint triangle that inks itself in as you learn. */}
        {Object.values(TOPICS).map((topic, index) => {
          const qs = topicQuestions(topic.id)
          const known = qs.filter((question) => {
            const status = statusOf(state, question.id)
            return status === 'mastered' || status === 'charted'
          })
          const pairs: Array<[Question, Question]> = [
            [qs[0], qs[1]],
            [qs[1], qs[2]],
            [qs[2], qs[0]],
          ]
          return (
            <g key={topic.id}>
              {pairs.map(([a, b], i) => (
                <path
                  key={`pencil-${i}`}
                  d={sketchLine(a.map, b.map, index + i, 5)}
                  fill="none"
                  stroke="rgba(243,236,220,0.12)"
                  strokeWidth="1.2"
                  strokeDasharray="2 8"
                  aria-hidden="true"
                />
              ))}
              {pairs.map(([a, b], i) => {
                if (!known.includes(a) || !known.includes(b)) return null
                return (
                  <path
                    key={`ink-${i}`}
                    d={sketchLine(a.map, b.map, index + i + 4, 4)}
                    fill="none"
                    stroke={topic.hue}
                    strokeOpacity="0.5"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  />
                )
              })}
            </g>
          )
        })}

        {Object.values(TOPICS).map((topic) => {
          const qs = topicQuestions(topic.id)
          const known = qs.filter((question) => {
            const status = statusOf(state, question.id)
            return status === 'mastered' || status === 'charted'
          }).length
          const at = REGION_LABEL[topic.id]
          return (
            <g key={topic.id} className="constellation" aria-hidden="true">
              <text x={at.x} y={at.y} textAnchor="middle" className="constellation-name" fill={topic.hue}>
                {topic.name}
              </text>
              <path
                d={`M ${at.x - 52} ${at.y + 9} q 26 7 54 1 t 50 -3`}
                fill="none"
                stroke={topic.hue}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.55"
              />
              <text x={at.x} y={at.y + 22} textAnchor="middle" className="constellation-note">
                {topic.discipline.toLowerCase()} · {known}/{qs.length} charted
              </text>
            </g>
          )
        })}

        <Station />

        <g className="worlds">
          {[...QUESTIONS]
            .sort(
              (a, b) =>
                Number(a.id === activeId) - Number(b.id === activeId) ||
                Number(statusOf(state, a.id) === 'uncharted') -
                  Number(statusOf(state, b.id) === 'uncharted'),
            )
            .map((question) => (
              <WorldMark
                key={question.id}
                question={question}
                status={statusOf(state, question.id)}
                isActive={question.id === activeId && state.phase === 'underway'}
                selected={selected === question.id}
                onSelect={setSelected}
              />
            ))}
        </g>

        {landingKey > 0 && motion ? (
          <g
            key={landingKey}
            className="landing-bloom"
            transform={`translate(${shipRest.x} ${shipRest.y})`}
            aria-hidden="true"
          >
            <circle r="7" className="landing-ring" stroke={activeTopic.hue} />
            <circle r="7" className="landing-ring landing-ring--late" stroke="#FFD166" />
            <path
              className="landing-spark"
              d="M0 -40V-26M0 26V40M-40 0H-26M26 0H40"
              stroke={activeTopic.hue}
            />
          </g>
        ) : null}

        {flight && motion ? (
          <g key={`flight-${flight.key}`} className="flight">
            <path
              d={flightArc(flight.from, flight.to).d}
              pathLength={1}
              className="flight-trail"
              fill="none"
            />
            <g className="ship ship--moving">
              <g transform="scale(0.82)">
                <Ship color={activeTopic.hue} />
              </g>
              <animateMotion
                dur="0.95s"
                fill="freeze"
                rotate="auto"
                path={flightArc(flight.from, flight.to).d}
                calcMode="spline"
                keyTimes="0;1"
                keySplines="0.42 0 0.28 1"
              />
            </g>
          </g>
        ) : (
          <g
            className={`ship ship--resting ${atStation ? 'is-docked' : ''} ${
              landing ? 'is-landing' : ''
            }`}
            transform={`translate(${shipRest.x} ${shipRest.y - shipLift})`}
            aria-hidden="true"
          >
            <ellipse cx="0" cy={shipLift - 6} rx="14" ry="4" fill="rgba(0,0,0,0.32)" />
            <g transform="scale(0.96)">
              <Ship color={activeTopic.hue} />
            </g>
          </g>
        )}
      </svg>

      <div className="atlas-foot">
        <ul className="atlas-legend" aria-label="Atlas legend">
          <li className="atlas-key atlas-key--mastered">
            <StarIcon aria-hidden="true" />
            mastered <b>{progress.mastered}</b>
          </li>
          <li className="atlas-key atlas-key--charted">
            <CheckIcon aria-hidden="true" />
            charted <b>{progress.charted}</b>
          </li>
          <li className="atlas-key atlas-key--anomaly">
            <AnomalyIcon aria-hidden="true" />
            signals <b>{progress.anomalies}</b>
          </li>
          <li className="atlas-key atlas-key--uncharted">
            <span className="legend-halo" aria-hidden="true" />
            uncharted <b>{Math.max(0, progress.total - progress.known - progress.anomalies)}</b>
          </li>
        </ul>
        <p className="atlas-tip">
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
              <span className="node-file-dot" aria-hidden="true" />
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
