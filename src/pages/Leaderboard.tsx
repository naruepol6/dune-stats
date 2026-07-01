import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPlayerStats } from '../lib/api'
import type { PlayerStats } from '../lib/types'
import { Bar, ErrorBox, Loading, useAsync } from '../components/ui'
import { avg, pct } from '../lib/format'

type SortKey = 'winrate' | 'avg_placement' | 'games' | 'wins'

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
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <label className="text-sm text-gray-600">
          Sort by{' '}
          <select
            className="rounded border px-2 py-1"
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
        <div className="overflow-hidden rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Player</th>
                <th className="p-2 text-right">GP</th>
                <th className="p-2 text-right">W</th>
                <th className="p-2">Win rate</th>
                <th className="p-2 text-right">Avg</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p: PlayerStats, i) => (
                <tr key={p.player_id} className="border-t">
                  <td className="p-2 text-gray-400">{i + 1}</td>
                  <td className="p-2 font-medium">
                    <Link className="text-amber-700 hover:underline" to={`/players/${p.player_id}`}>
                      {p.player_name}
                    </Link>
                  </td>
                  <td className="p-2 text-right tabular-nums">{p.games}</td>
                  <td className="p-2 text-right tabular-nums">{p.wins}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-9 tabular-nums">{pct(p.winrate)}</span>
                      <div className="flex-1">
                        <Bar value={p.winrate} />
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-right tabular-nums">{avg(p.avg_placement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">
        GP = games played, W = wins (1st place), Avg = average placement (lower is better).
      </p>
    </section>
  )
}

function Empty() {
  return (
    <div className="rounded border bg-white p-6 text-center text-sm text-gray-500">
      No games recorded yet.{' '}
      <Link to="/enter" className="text-amber-700 hover:underline">
        Add the first game
      </Link>
      .
    </div>
  )
}
