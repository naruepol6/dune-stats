import { useState } from 'react'
import {
  addLeader,
  addPlayer,
  getLeaders,
  getPlayers,
  renameLeader,
  renamePlayer,
  setLeaderHidden,
  setPlayerHidden,
} from '../lib/api'
import { Badge, Button, Card, ErrorBox, Loading, useAsync } from '../components/ui'

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'

export default function Roster() {
  return (
    <section className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
      <PlayerRoster />
      <LeaderRoster />
    </section>
  )
}

function PlayerRoster() {
  const { data, loading, error, reload } = useAsync(() => getPlayers(true), [])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const players = data ?? []

  return (
    <div>
      <h2 className="mb-2 font-semibold">Players</h2>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          act(() => addPlayer(name)).then(() => setName(''))
        }}
      >
        <input
          className={`flex-1 ${inputCls}`}
          placeholder="New player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          Add
        </Button>
      </form>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <span className={p.hidden ? 'text-slate-400 line-through' : ''}>{p.name}</span>
              <span className="flex gap-3 text-xs">
                <button
                  className="text-cyan-700 hover:underline dark:text-cyan-400"
                  onClick={() => {
                    const next = prompt('Rename player', p.name)
                    if (next && next.trim() && next !== p.name) act(() => renamePlayer(p.id, next))
                  }}
                >
                  Rename
                </button>
                <button
                  className="text-slate-500 hover:underline dark:text-slate-400"
                  onClick={() => act(() => setPlayerHidden(p.id, !p.hidden))}
                >
                  {p.hidden ? 'Unhide' : 'Hide'}
                </button>
              </span>
            </li>
          ))}
          {players.length === 0 && (
            <li className="p-3 text-slate-500 dark:text-slate-400">No players yet.</li>
          )}
        </ul>
      </Card>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Hidden players stay out of the dropdowns but keep their stats and game history.
      </p>
    </div>
  )
}

function LeaderRoster() {
  const { data, loading, error, reload } = useAsync(() => getLeaders(true), [])
  const [name, setName] = useState('')
  const [expansion, setExpansion] = useState('')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <ErrorBox message={error} />
  const leaders = data ?? []

  return (
    <div>
      <h2 className="mb-2 font-semibold">Leaders</h2>
      <form
        className="mb-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          act(() => addLeader(name, expansion)).then(() => {
            setName('')
            setExpansion('')
          })
        }}
      >
        <input
          className={`min-w-40 flex-1 ${inputCls}`}
          placeholder="New leader name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={`w-36 ${inputCls}`}
          placeholder="Expansion"
          value={expansion}
          onChange={(e) => setExpansion(e.target.value)}
        />
        <Button type="submit" disabled={busy || !name.trim()}>
          Add
        </Button>
      </form>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {leaders.map((l) => (
            <li key={l.id} className="flex items-center justify-between p-3">
              <span className={l.hidden ? 'text-slate-400 line-through' : ''}>
                {l.name}
                {l.expansion && <Badge className="ml-2">{l.expansion}</Badge>}
              </span>
              <span className="flex gap-3 text-xs">
                <button
                  className="text-cyan-700 hover:underline dark:text-cyan-400"
                  onClick={() => {
                    const next = prompt('Rename leader', l.name)
                    if (next && next.trim() && next !== l.name) act(() => renameLeader(l.id, next))
                  }}
                >
                  Rename
                </button>
                <button
                  className="text-slate-500 hover:underline dark:text-slate-400"
                  onClick={() => act(() => setLeaderHidden(l.id, !l.hidden))}
                >
                  {l.hidden ? 'Unhide' : 'Hide'}
                </button>
              </span>
            </li>
          ))}
          {leaders.length === 0 && (
            <li className="p-3 text-slate-500 dark:text-slate-400">No leaders yet.</li>
          )}
        </ul>
      </Card>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Hidden leaders stay out of the dropdowns but keep their stats.
      </p>
    </div>
  )
}
