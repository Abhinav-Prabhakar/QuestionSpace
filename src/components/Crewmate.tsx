interface CrewmateProps {
  color: string
  size?: number
  className?: string
  /** A tiny expression shift; still readable at 32 px. */
  mood?: 'happy' | 'worried' | 'focused'
  title?: string
}

/** A bean-shaped astronaut, drawn to feel like a sticker. */
export function Crewmate({
  color,
  size = 56,
  className = '',
  mood = 'happy',
  title,
}: CrewmateProps) {
  return (
    <svg
      className={`crewmate ${className}`}
      width={size}
      height={size}
      viewBox="0 0 72 84"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <ellipse cx="38" cy="78" rx="20" ry="4" fill="rgba(20,28,48,0.18)" />
      {/* backpack */}
      <rect
        x="8"
        y="30"
        width="17"
        height="31"
        rx="8"
        fill={color}
        stroke="#1B2437"
        strokeWidth="3.2"
      />
      <path d="M13 39h7M13 46h7" stroke="#1B2437" strokeWidth="2" strokeLinecap="round" />
      {/* legs */}
      <path
        d="M25 68v9c0 2 1.4 3.4 3.4 3.4H33V68M47 68v9c0 2-1.4 3.4-3.4 3.4H40V68"
        fill={color}
        stroke="#1B2437"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* body */}
      <path
        d="M20 33c0-13 9.4-23 20-23 13 0 22 10.6 22 26v22c0 12-8 22-20.5 22H39c-11 0-19-8.4-19-20V33Z"
        fill={color}
        stroke="#1B2437"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      {/* visor */}
      <path
        d="M28 34c0-7 6-12.4 14-12.4 8.2 0 14 5.2 14 12.2 0 7.4-5.8 12.6-14 12.6s-14-5-14-12.4Z"
        fill="#D8F3FF"
        stroke="#1B2437"
        strokeWidth="3"
      />
      <path
        d="M34 29c2.6-3.2 6.6-4.2 10-3.3"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="48" cy="38" r="2.2" fill="#1B2437" />
      {mood === 'worried' ? (
        <path d="M32 42c2 1.4 4.4 1.4 6.4 0" fill="none" stroke="#1B2437" strokeWidth="1.8" strokeLinecap="round" />
      ) : mood === 'focused' ? (
        <path d="M32 42h7" fill="none" stroke="#1B2437" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M31 41c2.2 2.4 5.2 2.4 7.4 0" fill="none" stroke="#1B2437" strokeWidth="1.8" strokeLinecap="round" />
      )}
      {/* chest badge */}
      <circle cx="41" cy="58" r="5.4" fill="#F7EED9" stroke="#1B2437" strokeWidth="2" />
      <path d="M41 55.6v4.8M38.6 58h4.8" stroke="#1B2437" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
