import { useState } from 'react'
import { getLeaderStats } from '../lib/api'
import { Bar, ErrorBox, Loading, useAsync } from '../components/ui'
import { LeaderName } from '../components/LeaderName'
import { avg, pct } from '../lib/format'

type SortKey = 'winrate' | 'avg_placement' | 'games'

export default function LeaderList() {
  const { data, loading, error } = useAsync(getLeaderStats, [])
  const [sort, setSort] = useState<SortKey>('avg_placement')
  const [hidePlayed0, setHidePlayed0] = useState(true)

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />

  let rows = (data ?? []).filter((l) => !l.hidden)
  if (hidePlayed0) rows = rows.filter((l) => l.games > 0)
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'avg_placement') return (a.avg_placement ?? 9) - (b.avg_placement ?? 9)
    return (b[sort] as number) - (a[sort] as number)
  })

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Leaders</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={hidePlayed0}
              onChange={(e) => setHidePlayed0(e.target.checked)}
            />
            Hide unplayed
          </label>
          <label>
            Sort{' '}
            <select
              className="rounded border px-2 py-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="winrate">Win rate</option>
              <option value="avg_placement">Avg placement</option>
              <option value="games">Games</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded border bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="p-2">Leader</th>
              <th className="p-2 text-right">GP</th>
              <th className="p-2 text-right">W</th>
              <th className="p-2">Win rate</th>
              <th className="p-2 text-right">Avg</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.leader_id} className="border-t dark:border-gray-700">
                <td className="p-2 font-medium">
                  <LeaderName id={l.leader_id} name={l.leader_name} imageUrl={l.image_url} />
                </td>
                <td className="p-2 text-right tabular-nums">{l.games}</td>
                <td className="p-2 text-right tabular-nums">{l.wins}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="w-9 tabular-nums">{pct(l.winrate)}</span>
                    <div className="flex-1">
                      <Bar value={l.winrate} />
                    </div>
                  </div>
                </td>
                <td className="p-2 text-right tabular-nums">{avg(l.avg_placement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
