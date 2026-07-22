import { Link, useNavigate } from 'react-router-dom'
import { getGames } from '../lib/api'
import type { GameWithResults } from '../lib/types'
import { Card, ErrorBox, Loading, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { RankMedal } from '../components/icons'
import { formatDate } from '../lib/format'

export default function GameLog() {
  const { data, loading, error } = useAsync(getGames, [])
  const navigate = useNavigate()

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const games = data ?? []

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Games</h1>
        <Link
          to="/enter"
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
        >
          + Add game
        </Link>
      </div>

      {games.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No games yet.
        </Card>
      ) : (
        <ul className="space-y-3">
          {games.map((g: GameWithResults) => (
            <Card key={g.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {formatDate(g.played_on)}
                </span>
                <button
                  className="text-sm text-cyan-700 hover:underline dark:text-cyan-400"
                  onClick={() => navigate(`/games/${g.id}/edit`)}
                >
                  Edit
                </button>
              </div>
              <ol className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {[...g.results]
                  .sort((a, b) => a.placement - b.placement)
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        <RankMedal place={r.placement} />
                        <Link
                          className="font-medium text-cyan-700 hover:underline dark:text-cyan-400"
                          to={`/players/${r.player_id}`}
                        >
                          {r.player_name}
                        </Link>
                      </span>
                      <span className="flex items-center gap-2">
                        <LeaderName
                          id={r.leader_id}
                          name={r.leader_name}
                          imageUrl={r.image_url}
                          className="text-slate-500 hover:underline dark:text-slate-400"
                        />
                        {r.vp != null && (
                          <span className="shrink-0 tabular-nums text-xs font-medium text-slate-400 dark:text-slate-500">
                            {r.vp} VP
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
              </ol>
              {g.note && (
                <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {g.note}
                </p>
              )}
            </Card>
          ))}
        </ul>
      )}
    </section>
  )
}
