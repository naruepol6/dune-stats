import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getGames, softDeleteGame } from '../lib/api'
import type { GameWithResults } from '../lib/types'
import { ErrorBox, Loading, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { RankMedal } from '../components/icons'
import { formatDate } from '../lib/format'

export default function GameLog() {
  const { data, loading, error, reload } = useAsync(getGames, [])
  const navigate = useNavigate()
  const [busy, setBusy] = useState<string | null>(null)

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const games = data ?? []

  async function onDelete(id: string) {
    if (!confirm('Delete this game? It can be restored from the database if needed.')) return
    setBusy(id)
    try {
      await softDeleteGame(id)
      reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Games</h1>
        <Link
          to="/enter"
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          + Add game
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="rounded border bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No games yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {games.map((g: GameWithResults) => (
            <li key={g.id} className="rounded border bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b px-3 py-2 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{formatDate(g.played_on)}</span>
                <span className="flex gap-2 text-sm">
                  <button
                    className="text-amber-700 hover:underline"
                    onClick={() => navigate(`/games/${g.id}/edit`)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:underline disabled:opacity-50"
                    disabled={busy === g.id}
                    onClick={() => onDelete(g.id)}
                  >
                    Delete
                  </button>
                </span>
              </div>
              <ol className="divide-y text-sm dark:divide-gray-700">
                {[...g.results]
                  .sort((a, b) => a.placement - b.placement)
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <RankMedal place={r.placement} />
                        <Link className="font-medium text-amber-700 hover:underline" to={`/players/${r.player_id}`}>
                          {r.player_name}
                        </Link>
                      </span>
                      <LeaderName
                        id={r.leader_id}
                        name={r.leader_name}
                        imageUrl={r.image_url}
                        className="text-gray-600 hover:underline dark:text-gray-400"
                      />
                    </li>
                  ))}
              </ol>
              {g.note && <p className="border-t px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">{g.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
