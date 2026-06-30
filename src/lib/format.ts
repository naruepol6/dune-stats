export function pct(winrate: number | null | undefined): string {
  if (winrate == null) return '-'
  return `${(winrate * 100).toFixed(0)}%`
}

export function avg(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toFixed(2)
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣' }

export function placementLabel(p: number): string {
  return MEDALS[p] ?? String(p)
}

export function formatDate(iso: string): string {
  // iso is a date (YYYY-MM-DD) or timestamp; show YYYY-MM-DD.
  return iso.slice(0, 10)
}
