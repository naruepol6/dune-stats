import { placementLabel } from '../lib/format'

interface IconProps {
  className?: string
}

const RANK_COLOR: Record<number, string> = {
  1: '#d4a017', // gold
  2: '#9ca3af', // silver
  3: '#b8763e', // bronze
  4: '#6b7280', // slate
}

/**
 * A medal icon for a finishing place, tinted per rank, with the rank number
 * inside so it stays unambiguous regardless of color (accessibility). Exposes
 * the ordinal ("1st place") as an accessible label.
 */
export function RankMedal({ place, className }: { place: number; className?: string }) {
  const color = RANK_COLOR[place] ?? '#6b7280'
  const label = `${placementLabel(place)} place`
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'inline-block h-5 w-5 shrink-0'}
      style={{ color }}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <circle cx="12" cy="8" r="6" />
      <text
        x="12"
        y="8"
        fontSize="7"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        stroke="none"
      >
        {place}
      </text>
    </svg>
  )
}

/** Minimal line icons (Feather-style), inherit color via currentColor. */

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
