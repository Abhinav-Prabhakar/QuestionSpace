import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 12.4l4.6 4.4L20 5.8" />
    </Base>
  )
}

export function StarIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path
        d="M12 3.4l2.5 5.2 5.7.8-4.2 4 .9 5.7-4.9-2.7-5 2.7 1-5.7-4.2-4 5.7-.8L12 3.4Z"
        fill="currentColor"
        stroke="currentColor"
      />
    </Base>
  )
}

export function AnomalyIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.6" strokeDasharray="2.2 3.2" />
      <path d="M12 7.4v6.2" />
      <circle cx="12" cy="17" r="0.7" fill="currentColor" />
    </Base>
  )
}

export function ScanIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="10.4" cy="10.4" r="6.1" />
      <path d="M15 15l4.4 4.4M7.5 9.2h5.8M10.4 6.3v5.8" />
    </Base>
  )
}

export function SkipIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 6.5l6 5.5-6 5.5M12.5 6.5l6 5.5-6 5.5M20.5 6v12" />
    </Base>
  )
}

export function RetryIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 9.2A8 8 0 1 1 4 13.8" />
      <path d="M4.2 4.6v5h5" />
    </Base>
  )
}

export function FuelIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 3.8h8.2v15.5a1.7 1.7 0 0 1-1.7 1.7H8.2a1.7 1.7 0 0 1-1.7-1.7V3.8Z" />
      <path d="M9.4 3.8V2.4h3.4v1.4M14.7 8h1.7l2.1 2.3v6.3a1.3 1.3 0 0 1-2.6 0v-4.2" />
      <path d="M9 7.5h3.2v5H9z" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function CrewIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.4 13V9.2a5.6 5.6 0 0 1 11.2 0V16c0 2.7-2 4.7-4.7 4.7h-1.1c-2.4 0-4.4-1.8-4.4-4.2V13Z" />
      <path d="M9.5 10.2c0-1.9 1.6-3.2 3.6-3.2 2 0 3.5 1.3 3.5 3.2 0 1.9-1.5 3.2-3.5 3.2S9.5 12 9.5 10.2Z" fill="currentColor" stroke="none" />
      <path d="M8.5 20v1.6M16.5 20v1.6" />
    </Base>
  )
}

export function BranchIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 20V9.5c0-2 1.6-3.5 3.5-3.5h1.8M5 14h4" />
      <path d="M14.5 3.5l4 3.2-4 3.2" />
      <path d="M9.5 6h4.2c2.2 0 3.4 1 4.8 3.7" />
      <circle cx="5" cy="20" r="1.4" fill="currentColor" />
      <circle cx="15" cy="20" r="1.4" fill="currentColor" />
      <path d="M5 20h9.5" strokeDasharray="2 2.4" />
    </Base>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 13v6.2c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6V13" />
    </Base>
  )
}

export function SoundIcon({ muted = false, ...props }: IconProps & { muted?: boolean }) {
  return (
    <Base {...props}>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4z" />
      {muted ? (
        <path d="M16 9l5 6M21 9l-5 6" />
      ) : (
        <>
          <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
          <path d="M18.4 6.4a7.6 7.6 0 0 1 0 11.2" />
        </>
      )}
    </Base>
  )
}

export function MotionIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 9.5c3.2-4 6.6-4 10.3-1.2M13.2 4.8l.7 3.6-3.6.6" />
      <path d="M20.5 14.5c-3.2 4-6.6 4-10.3 1.2M10.8 19.2l-.7-3.6 3.6-.6" />
    </Base>
  )
}

export function RocketDoodle(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12.4 3.2c3.6 2 5.6 5.7 5.6 10.2l-2.4 3.3H8.8l-2.4-3.3c0-4.5 2.4-8.2 6-10.2Z" />
      <circle cx="12.2" cy="9.6" r="2.3" />
      <path d="M8.8 14.2L5.6 18l.4-4.8M15.2 14.2l3.2 3.8-.4-4.8M9.6 18.8c.4 2 1.4 3.4 2.8 4.4 1.4-1 2.4-2.4 2.8-4.4" />
    </Base>
  )
}

export function CompassDoodle(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2 5.2-2Z" fill="currentColor" stroke="none" />
    </Base>
  )
}
