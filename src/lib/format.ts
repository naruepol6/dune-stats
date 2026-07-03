export function pct(winrate: number | null | undefined): string {
  if (winrate == null) return '-'
  return `${(winrate * 100).toFixed(0)}%`
}

export function avg(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toFixed(2)
}

const ORDINALS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' }

export function placementLabel(p: number): string {
  return ORDINALS[p] ?? `${p}th`
}

export function formatDate(iso: string): string {
  // iso is a date (YYYY-MM-DD) or timestamp; show YYYY-MM-DD.
  return iso.slice(0, 10)
}
