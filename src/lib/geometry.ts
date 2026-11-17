export interface Point {
  x: number
  y: number
}

/**
 * A gentle quadratic arc between two chart nodes.
 * Always bends the same way (counter-clockwise), so a multi-leg
 * expedition reads as a single plotted route rather than random hops.
 */
export function flightArc(from: Point, to: Point): { d: string; control: Point } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy) || 1
  const bend = distance * 0.26
  // Rotate the direction vector by -90° for a consistent sweep.
  const control = {
    x: (from.x + to.x) / 2 + (dy / distance) * bend,
    y: (from.y + to.y) / 2 - (dx / distance) * bend,
  }
  return {
    d: `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`,
    control,
  }
}

/** Point on the quadratic curve at t (for the resting ship / trailing glow). */
export function pointOnArc(from: Point, to: Point, t: number): Point {
  const { control } = flightArc(from, to)
  const mt = 1 - t
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  }
}

/** Polar helper for the mission ring. */
export function polar(cx: number, cy: number, radius: number, degrees: number): Point {
  const rad = ((degrees - 90) * Math.PI) / 180
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius }
}

/** SVG arc segment between two angles. */
export function arcSegment(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, radius, startDeg)
  const end = polar(cx, cy, radius, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/** Label anchored away from the chart centre so stars near an edge stay readable. */
export function labelAnchor(x: number): 'start' | 'middle' | 'end' {
  if (x < 300) return 'start'
  if (x > 700) return 'end'
  return 'middle'
}

/** A slightly irregular circle, for pencil-on-paper charts. */
export function wobblyCircle(
  cx: number,
  cy: number,
  radius: number,
  seed = 1,
  amplitude = 2.4,
): string {
  const points: Point[] = []
  const steps = 32
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    const jitter =
      Math.sin(i * 2.7 + seed * 3.1) * amplitude +
      Math.cos(i * 1.3 + seed) * amplitude * 0.45
    points.push({
      x: cx + Math.cos(angle) * (radius + jitter),
      y: cy + Math.sin(angle) * (radius + jitter),
    })
  }
  return (
    `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} ` +
    points
      .slice(1)
      .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ') +
    ' Z'
  )
}

/** A gently bowed line, so routes look drawn rather than plotted. */
export function sketchLine(from: Point, to: Point, seed = 1, amplitude = 4): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const bend = Math.sin(seed * 2.3) * amplitude
  const control = {
    x: (from.x + to.x) / 2 + (dy / length) * bend,
    y: (from.y + to.y) / 2 - (dx / length) * bend,
  }
  return `M ${from.x} ${from.y} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${to.x} ${to.y}`
}
