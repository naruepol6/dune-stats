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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <label className="text-sm text-slate-500 dark:text-slate-400">
          Sort by{' '}
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
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">Player</th>
                  <th className="p-3 text-right font-medium">GP</th>
                  <th className="p-3 text-right font-medium">W</th>
                  <th className="p-3 font-medium">Win rate</th>
                  <th className="p-3 text-right font-medium">Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((p: PlayerStats, i) => (
                  <tr key={p.player_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="p-3">
                      <Link className={linkCls} to={`/players/${p.player_id}`}>
                        {p.player_name}
                      </Link>
                    </td>
                    <td className="p-3 text-right tabular-nums">{p.games}</td>
                    <td className="p-3 text-right tabular-nums">{p.wins}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-9 tabular-nums">{pct(p.winrate)}</span>
                        <div className="flex-1">
                          <Bar value={p.winrate} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">{avg(p.avg_placement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {sorted.map((p, i) => (
              <Card key={p.player_id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-slate-400">{i + 1}</span>
                    <Link className={linkCls} to={`/players/${p.player_id}`}>
                      {p.player_name}
                    </Link>
                  </div>
                  <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                    avg {avg(p.avg_placement)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="w-10 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {pct(p.winrate)}
                  </span>
                  <Bar value={p.winrate} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    GP{' '}
                    <b className="tabular-nums text-slate-700 dark:text-slate-200">{p.games}</b>
                  </span>
                  <span>
                    W <b className="tabular-nums text-slate-700 dark:text-slate-200">{p.wins}</b>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
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
