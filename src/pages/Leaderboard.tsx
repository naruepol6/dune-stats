import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPlayerStats } from '../lib/api'
import type { PlayerStats } from '../lib/types'
import { Bar, Card, ErrorBox, Loading, useAsync } from '../components/ui'
import { SortTh, nextSort, type SortState } from '../components/SortHeader'
import { avg, pct } from '../lib/format'

type SortKey = 'winrate' | 'avg_placement' | 'games' | 'wins'

const linkCls = 'font-medium text-cyan-700 hover:underline dark:text-cyan-400'

function playerValue(p: PlayerStats, key: SortKey): number {
  if (key === 'avg_placement') return p.avg_placement ?? 9
  return p[key]
}

export default function Leaderboard() {
  const { data, loading, error } = useAsync(getPlayerStats, [])
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'avg_placement', dir: 'asc' })
  const onSort = (key: SortKey, defaultDir: 'asc' | 'desc') =>
    setSort((s) => nextSort(s, key, defaultDir))

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const rows = (data ?? []).filter((p) => p.games > 0)

  const sorted = [...rows].sort((a, b) => {
    const d = playerValue(a, sort.key) - playerValue(b, sort.key)
    return (sort.dir === 'asc' ? d : -d) || a.player_name.localeCompare(b.player_name)
  })

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
      </div>

      {sorted.length === 0 ? (
        <Empty />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-medium sm:px-3">#</th>
                  <th className="px-2 py-2 font-medium sm:px-3">Player</th>
                  <SortTh
                    sortKey="games"
                    label="GP"
                    defaultDir="desc"
                    sort={sort}
                    onSort={onSort}
                    align="right"
                    className="px-2 py-2 sm:px-3"
                  />
                  <SortTh
                    sortKey="wins"
                    label="W"
                    defaultDir="desc"
                    sort={sort}
                    onSort={onSort}
                    align="right"
                    className="px-2 py-2 sm:px-3"
                  />
                  <SortTh
                    sortKey="winrate"
                    label="Win rate"
                    defaultDir="desc"
                    sort={sort}
                    onSort={onSort}
                    className="px-2 py-2 sm:px-3"
                  />
                  <SortTh
                    sortKey="avg_placement"
                    label="Avg"
                    defaultDir="asc"
                    sort={sort}
                    onSort={onSort}
                    align="right"
                    className="px-2 py-2 sm:px-3"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((p: PlayerStats, i) => (
                  <tr key={p.player_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-2 py-2 tabular-nums text-slate-400 sm:px-3">{i + 1}</td>
                    <td className="px-2 py-2 sm:px-3">
                      <Link className={linkCls} to={`/players/${p.player_id}`}>
                        {p.player_name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums sm:px-3">{p.games}</td>
                    <td className="px-2 py-2 text-right tabular-nums sm:px-3">{p.wins}</td>
                    <td className="px-2 py-2 sm:px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 tabular-nums">{pct(p.winrate)}</span>
                        <div className="w-16 flex-1 sm:w-auto">
                          <Bar value={p.winrate} />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                      {avg(p.avg_placement)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        GP = games played, W = wins (1st place), Avg = average placement (lower is better).
      </p>
    </section>
  )
}

function Empty() {
  return (
    <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      No games recorded yet.{' '}
      <Link to="/enter" className={linkCls}>
        Add the first game
      </Link>
      .
    </Card>
  )
}
