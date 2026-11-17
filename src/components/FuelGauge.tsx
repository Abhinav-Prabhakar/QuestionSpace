import { FuelIcon } from './Icons'

interface FuelGaugeProps {
  fuel: number
  max: number
  /** Compact mode is used in dense headers. */
  compact?: boolean
}

/**
 * Fuel is spare propellant: a resource readout, never a life total.
 * Segments + a number, so it never depends on colour alone.
 */
export function FuelGauge({ fuel, max, compact = false }: FuelGaugeProps) {
  return (
    <div
      className={`fuel ${compact ? 'fuel--compact' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={fuel}
      aria-label={`Fuel ${fuel} of ${max} cells`}
    >
      <FuelIcon className="fuel-icon" aria-hidden="true" />
      <span className="fuel-label" aria-hidden="true">
        Fuel
      </span>
      <span className="fuel-cells" aria-hidden="true">
        {Array.from({ length: max }).map((_, index) => (
          <span key={index} className={`fuel-cell ${index < fuel ? 'is-full' : ''}`} />
        ))}
      </span>
      <span className="fuel-value" aria-hidden="true">
        {fuel}
        <span>/{max}</span>
      </span>
    </div>
  )
}
