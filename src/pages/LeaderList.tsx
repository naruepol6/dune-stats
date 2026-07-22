import { useState } from 'react'
import { getLeaderStats } from '../lib/api'
import { Bar, Card, ErrorBox, Loading, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { TierBadge } from '../components/TierBadge'
import { avg, pct } from '../lib/format'
import type { LeaderStats } from '../lib/types'

type SortKey = 'tier' | 'winrate' | 'avg_placement' | 'games'

const TIER_GROUPS: { key: string; label: string }[] = [
  { key: 'A', label: 'Tier A' },
  { key: 'B', label: 'Tier B' },
  { key: 'C', label: 'Tier C' },
  { key: 'untiered', label: 'Untiered' },
]

// A -> B -> C, untiered last.
function tierRank(tier: string | null): number {
  const i = ['A', 'B', 'C'].indexOf(tier ?? '')
  return i === -1 ? 99 : i
}

export default function LeaderList() {
  const { data, loading, error } = useAsync(getLeaderStats, [])
  const [sort, setSort] = useState<SortKey>('avg_placement')
  const [hidePlayed0, setHidePlayed0] = useState(true)
  const [groupByTier, setGroupByTier] = useState(false)

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  let rows = (data ?? []).filter((l) => !l.hidden)
  if (hidePlayed0) rows = rows.filter((l) => l.games > 0)

  function sortRows(list: LeaderStats[]): LeaderStats[] {
    return [...list].sort((a, b) => {
      if (sort === 'tier') {
        const t = tierRank(a.tier) - tierRank(b.tier)
        if (t !== 0) return t
        return (a.avg_placement ?? 9) - (b.avg_placement ?? 9)
      }
      if (sort === 'avg_placement') return (a.avg_placement ?? 9) - (b.avg_placement ?? 9)
      return (b[sort] as number) - (a[sort] as number)
    })
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Leaders</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="accent-cyan-600"
              checked={hidePlayed0}
              onChange={(e) => setHidePlayed0(e.target.checked)}
            />
            Hide unplayed
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="accent-cyan-600"
              checked={groupByTier}
              onChange={(e) => setGroupByTier(e.target.checked)}
            />
            Group by tier
          </label>
          <label>
            Sort{' '}
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="tier">Tier</option>
              <option value="winrate">Win rate</option>
              <option value="avg_placement">Avg placement</option>
              <option value="games">Games</option>
            </select>
          </label>
        </div>
      </div>

      {groupByTier ? (
        <div className="space-y-6">
          {TIER_GROUPS.map((g) => {
            const groupRows = sortRows(
              rows.filter((l) => (g.key === 'untiered' ? !l.tier : l.tier === g.key)),
            )
            if (groupRows.length === 0) return null
            return (
              <div key={g.key}>
                <h2 className="mb-2 flex items-center gap-2 font-semibold">
                  {g.key === 'untiered' ? g.label : <TierBadge tier={g.key} />}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                    {groupRows.length}
                  </span>
                </h2>
                <LeaderTable rows={groupRows} />
                <LeaderCards rows={groupRows} />
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <LeaderTable rows={sortRows(rows)} />
          <LeaderCards rows={sortRows(rows)} />
        </>
      )}
    </section>
  )
}

function LeaderTable({ rows }: { rows: LeaderStats[] }) {
  return (
    <Card className="hidden overflow-hidden sm:block">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            <th className="p-3 font-medium">Leader</th>
            <th className="p-3 font-medium">Tier</th>
            <th className="p-3 text-right font-medium">GP</th>
            <th className="p-3 text-right font-medium">W</th>
            <th className="p-3 font-medium">Win rate</th>
            <th className="p-3 text-right font-medium">Avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((l) => (
            <tr key={l.leader_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="p-3 font-medium">
                <LeaderName id={l.leader_id} name={l.leader_name} imageUrl={l.image_url} />
              </td>
              <td className="p-3">
                <TierBadge tier={l.tier} />
              </td>
              <td className="p-3 text-right tabular-nums">{l.games}</td>
              <td className="p-3 text-right tabular-nums">{l.wins}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span className="w-9 tabular-nums">{pct(l.winrate)}</span>
                  <div className="flex-1">
                    <Bar value={l.winrate} />
                  </div>
                </div>
              </td>
              <td className="p-3 text-right tabular-nums">{avg(l.avg_placement)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function LeaderCards({ rows }: { rows: LeaderStats[] }) {
  return (
    <div className="space-y-2 sm:hidden">
      {rows.map((l) => (
        <Card key={l.leader_id} className="p-3">
          <div className="flex items-center justify-between gap-2">
            <LeaderName id={l.leader_id} name={l.leader_name} imageUrl={l.image_url} />
            <div className="flex items-center gap-2">
              <TierBadge tier={l.tier} />
              <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                avg {avg(l.avg_placement)}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-10 text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {pct(l.winrate)}
            </span>
            <Bar value={l.winrate} />
          </div>
          <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>
              GP <b className="tabular-nums text-slate-700 dark:text-slate-200">{l.games}</b>
            </span>
            <span>
              W <b className="tabular-nums text-slate-700 dark:text-slate-200">{l.wins}</b>
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
