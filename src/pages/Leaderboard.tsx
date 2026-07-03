import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPlayerStats } from '../lib/api'
import type { PlayerStats } from '../lib/types'
import { Bar, Card, ErrorBox, Loading, useAsync } from '../components/ui'
import { avg, pct } from '../lib/format'

type SortKey = 'winrate' | 'avg_placement' | 'games' | 'wins'

const linkCls = 'font-medium text-cyan-700 hover:underline dark:text-cyan-400'

export default function Leaderboard() {
  const { data, loading, error } = useAsync(getPlayerStats, [])
  const [sort, setSort] = useState<SortKey>('avg_placement')

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const rows = (data ?? []).filter((p) => p.games > 0)

  const sorted = [...rows].sort((a, b) => {
    if (sort === 'avg_placement') return (a.avg_placement ?? 9) - (b.avg_placement ?? 9)
    return (b[sort] as number) - (a[sort] as number)
  })

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <label className="text-sm text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Sort by </span>
          <select
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="winrate">Win rate</option>
            <option value="avg_placement">Avg placement</option>
            <option value="wins">Wins</option>
            <option value="games">Games</option>
          </select>
        </label>
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
                  <th className="px-2 py-2 text-right font-medium sm:px-3">GP</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">W</th>
                  <th className="px-2 py-2 font-medium sm:px-3">Win rate</th>
                  <th className="px-2 py-2 text-right font-medium sm:px-3">Avg</th>
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
