import { Link, useParams } from 'react-router-dom'
import { getLeaderResults, getLeaderStats } from '../lib/api'
import { ErrorBox, Loading, useAsync } from '../components/ui'
import { avg, formatDate, pct, placementLabel } from '../lib/format'

export default function LeaderDetail() {
  const { id = '' } = useParams()
  const { data, loading, error } = useAsync(
    async () => {
      const [stats, results] = await Promise.all([getLeaderStats(), getLeaderResults(id)])
      return { stat: stats.find((s) => s.leader_id === id) ?? null, results }
    },
    [id],
  )

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data?.stat) return <p className="p-4">Leader not found.</p>

  const { stat, results } = data

  // Who plays this leader, aggregated.
  const byPlayer = new Map<string, { name: string; id: string; games: number; wins: number }>()
  for (const r of results) {
    const e = byPlayer.get(r.player_id) ?? { name: r.player_name, id: r.player_id, games: 0, wins: 0 }
    e.games++
    if (r.placement === 1) e.wins++
    byPlayer.set(r.player_id, e)
  }
  const players = [...byPlayer.values()].sort((a, b) => b.games - a.games)

  return (
    <section className="space-y-5">
      <div>
        <Link to="/leaders" className="text-sm text-amber-700 hover:underline">
          &larr; Leaders
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          {stat.leader_name}
          {stat.expansion && (
            <span className="ml-2 text-sm font-normal text-gray-400">{stat.expansion}</span>
          )}
        </h1>
      </div>

      <StatCards
        items={[
          ['Games', String(stat.games)],
          ['Wins', String(stat.wins)],
          ['Win rate', pct(stat.winrate)],
          ['Avg place', avg(stat.avg_placement)],
        ]}
      />

      {players.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Played by</h2>
          <div className="overflow-hidden rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-2">Player</th>
                  <th className="p-2 text-right">Games</th>
                  <th className="p-2 text-right">Wins</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">
                      <Link className="text-amber-700 hover:underline" to={`/players/${p.id}`}>
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-2 text-right tabular-nums">{p.games}</td>
                    <td className="p-2 text-right tabular-nums">{p.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Game history</h2>
        {results.length === 0 ? (
          <p className="text-sm text-gray-500">Never played yet.</p>
        ) : (
          <ul className="divide-y rounded border bg-white text-sm">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-2">
                <span>
                  {placementLabel(r.placement)}{' '}
                  <Link className="text-amber-700 hover:underline" to={`/players/${r.player_id}`}>
                    {r.player_name}
                  </Link>
                </span>
                <span className="text-gray-400">{formatDate(r.played_on)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function StatCards({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded border bg-white p-3 text-center">
          <div className="text-lg font-bold tabular-nums">{value}</div>
          <div className="text-xs uppercase text-gray-500">{label}</div>
        </div>
      ))}
    </div>
  )
}
