import { Link, useParams } from 'react-router-dom'
import { getLeaderResults, getLeaderStats } from '../lib/api'
import { Badge, Card, ErrorBox, Loading, StatCards, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { TierBadge } from '../components/TierBadge'
import { RankMedal } from '../components/icons'
import { avg, formatDate, pct } from '../lib/format'

const linkCls = 'text-cyan-700 hover:underline dark:text-cyan-400'

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
        <Link to="/leaders" className={`text-sm ${linkCls}`}>
          &larr; Leaders
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LeaderName id={id} name={stat.leader_name} imageUrl={stat.image_url} className="hover:underline" />
          <TierBadge tier={stat.tier} />
          {stat.expansion && <Badge>{stat.expansion}</Badge>}
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
          {/* Desktop table */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="p-3 font-medium">Player</th>
                  <th className="p-3 text-right font-medium">Games</th>
                  <th className="p-3 text-right font-medium">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {players.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">
                      <Link className={linkCls} to={`/players/${p.id}`}>
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3 text-right tabular-nums">{p.games}</td>
                    <td className="p-3 text-right tabular-nums">{p.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {players.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-3">
                <Link className={linkCls} to={`/players/${p.id}`}>
                  {p.name}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <b className="tabular-nums text-slate-700 dark:text-slate-200">{p.games}</b> games,{' '}
                  <b className="tabular-nums text-slate-700 dark:text-slate-200">{p.wins}</b> wins
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Game history</h2>
        {results.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Never played yet.</p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {results.map((r) => (
                <li key={r.id} className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-1.5">
                    <RankMedal place={r.placement} />
                    <Link className={linkCls} to={`/players/${r.player_id}`}>
                      {r.player_name}
                    </Link>
                  </span>
                  <span className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                    {r.vp != null && <span className="tabular-nums">{r.vp} VP</span>}
                    <span>{formatDate(r.played_on)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  )
}
