import { Link, useParams } from 'react-router-dom'
import { getPlayerResults, getPlayerStats } from '../lib/api'
import { ErrorBox, Loading, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { avg, formatDate, pct, placementLabel } from '../lib/format'
import { StatCards } from './LeaderDetail'

export default function PlayerProfile() {
  const { id = '' } = useParams()
  const { data, loading, error } = useAsync(
    async () => {
      const [stats, results] = await Promise.all([getPlayerStats(), getPlayerResults(id)])
      return { stat: stats.find((s) => s.player_id === id) ?? null, results }
    },
    [id],
  )

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  if (!data?.stat) return <p className="p-4">Player not found.</p>

  const { stat, results } = data

  // Best / most-played leaders for this player.
  const byLeader = new Map<
    string,
    { name: string; id: string; imageUrl: string | null; games: number; wins: number }
  >()
  for (const r of results) {
    const e =
      byLeader.get(r.leader_id) ??
      { name: r.leader_name, id: r.leader_id, imageUrl: r.image_url, games: 0, wins: 0 }
    e.games++
    if (r.placement === 1) e.wins++
    byLeader.set(r.leader_id, e)
  }
  const leaders = [...byLeader.values()].sort(
    (a, b) => b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name),
  )

  return (
    <section className="space-y-5">
      <div>
        <Link to="/" className="text-sm text-amber-700 hover:underline">
          &larr; Leaderboard
        </Link>
        <h1 className="mt-1 text-xl font-bold">{stat.player_name}</h1>
      </div>

      <StatCards
        items={[
          ['Games', String(stat.games)],
          ['Wins', String(stat.wins)],
          ['Win rate', pct(stat.winrate)],
          ['Avg place', avg(stat.avg_placement)],
        ]}
      />

      {leaders.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Leaders played</h2>
          <div className="overflow-hidden rounded border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-2">Leader</th>
                  <th className="p-2 text-right">Games</th>
                  <th className="p-2 text-right">Wins</th>
                  <th className="p-2 text-right">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">
                      <LeaderName id={l.id} name={l.name} imageUrl={l.imageUrl} />
                    </td>
                    <td className="p-2 text-right tabular-nums">{l.games}</td>
                    <td className="p-2 text-right tabular-nums">{l.wins}</td>
                    <td className="p-2 text-right tabular-nums">{pct(l.wins / l.games)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Placement history</h2>
        {results.length === 0 ? (
          <p className="text-sm text-gray-500">No games yet.</p>
        ) : (
          <ul className="divide-y rounded border bg-white text-sm">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-2">
                <span>
                  {placementLabel(r.placement)} as{' '}
                  <LeaderName id={r.leader_id} name={r.leader_name} imageUrl={r.image_url} />
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
