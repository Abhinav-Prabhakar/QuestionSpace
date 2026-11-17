/** Deterministic, static star field. No animation, no layout cost after mount. */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Star {
  x: number
  y: number
  r: number
  o: number
  flare: boolean
}

function generateStars(count: number, seed = 1977): Star[] {
  const rand = mulberry32(seed)
  const stars: Star[] = []
  for (let i = 0; i < count; i += 1) {
    const x = 40 + rand() * 920
    const y = 40 + rand() * 920
    const bright = rand()
    const r = bright > 0.94 ? 1.9 : bright > 0.75 ? 1.15 : 0.55
    stars.push({
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      r,
      o: Number((0.12 + bright * 0.5).toFixed(2)),
      flare: bright > 0.94,
    })
  }
  return stars
}

const STARS = generateStars(190)

const DOODLES = [
  { x: 500, y: 150, color: '#FFD166', rotate: 12 },
  { x: 500, y: 860, color: '#63E6C3', rotate: -8 },
  { x: 90, y: 500, color: '#C0B0FF', rotate: 20 },
  { x: 910, y: 500, color: '#FF8D7A', rotate: -15 },
]

export function StarField() {
  return (
    <g className="star-field" aria-hidden="true">
      {STARS.map((star, i) =>
        star.flare ? (
          <g key={i} opacity={star.o}>
            <circle cx={star.x} cy={star.y} r={star.r} fill="#F6F1E6" />
            <path
              d={`M ${star.x - 6} ${star.y} H ${star.x + 6} M ${star.x} ${star.y - 6} V ${star.y + 6}`}
              stroke="#F6F1E6"
              strokeWidth="0.7"
              opacity="0.6"
            />
          </g>
        ) : (
          <circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#E8E4DA" opacity={star.o} />
        ),
      )}

      {DOODLES.map((doodle) => (
        <g
          key={`${doodle.x}-${doodle.y}`}
          transform={`translate(${doodle.x} ${doodle.y}) rotate(${doodle.rotate})`}
          opacity="0.62"
        >
          <path
            d="M0 -7V7M-7 0H7"
            stroke={doodle.color}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle r="1.9" fill={doodle.color} />
        </g>
      ))}

      <g opacity="0.36" transform="translate(862 845)">
        <circle r="12" fill="#1A2440" stroke="#7C8BA6" strokeWidth="1.2" />
        <ellipse rx="21" ry="6" fill="none" stroke="#7C8BA6" strokeWidth="1" transform="rotate(-18)" />
      </g>
    </g>
  )
}
