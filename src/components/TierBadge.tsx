const tierCls: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  C: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

/** Colored pill showing a leader's tier (A/B/C). Renders nothing when untiered. */
export function TierBadge({ tier, className = '' }: { tier: string | null; className?: string }) {
  if (!tier) return null
  const color = tierCls[tier] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color} ${className}`}
    >
      Tier {tier}
    </span>
  )
}
