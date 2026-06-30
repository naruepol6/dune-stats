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
import { ErrorBox, Loading, useAsync } from '../components/ui'

export default function Roster() {
  return (
    <section className="space-y-8">
      <h1 className="text-xl font-bold">Roster</h1>
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
          className="flex-1 rounded border px-2 py-1.5 text-sm"
          placeholder="New player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={busy || !name.trim()}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <ul className="divide-y rounded border bg-white text-sm">
        {players.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-2">
            <span className={p.hidden ? 'text-gray-400 line-through' : ''}>{p.name}</span>
            <span className="flex gap-3 text-xs">
              <button
                className="text-amber-700 hover:underline"
                onClick={() => {
                  const next = prompt('Rename player', p.name)
                  if (next && next.trim() && next !== p.name) act(() => renamePlayer(p.id, next))
                }}
              >
                Rename
              </button>
              <button
                className="text-gray-600 hover:underline"
                onClick={() => act(() => setPlayerHidden(p.id, !p.hidden))}
              >
                {p.hidden ? 'Unhide' : 'Hide'}
              </button>
            </span>
          </li>
        ))}
        {players.length === 0 && <li className="p-3 text-gray-500">No players yet.</li>}
      </ul>
      <p className="mt-1 text-xs text-gray-400">
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
          className="min-w-40 flex-1 rounded border px-2 py-1.5 text-sm"
          placeholder="New leader name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-36 rounded border px-2 py-1.5 text-sm"
          placeholder="Expansion"
          value={expansion}
          onChange={(e) => setExpansion(e.target.value)}
        />
        <button
          disabled={busy || !name.trim()}
          className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <ul className="divide-y rounded border bg-white text-sm">
        {leaders.map((l) => (
          <li key={l.id} className="flex items-center justify-between p-2">
            <span className={l.hidden ? 'text-gray-400 line-through' : ''}>
              {l.name}
              {l.expansion && <span className="ml-2 text-xs text-gray-400">{l.expansion}</span>}
            </span>
            <span className="flex gap-3 text-xs">
              <button
                className="text-amber-700 hover:underline"
                onClick={() => {
                  const next = prompt('Rename leader', l.name)
                  if (next && next.trim() && next !== l.name) act(() => renameLeader(l.id, next))
                }}
              >
                Rename
              </button>
              <button
                className="text-gray-600 hover:underline"
                onClick={() => act(() => setLeaderHidden(l.id, !l.hidden))}
              >
                {l.hidden ? 'Unhide' : 'Hide'}
              </button>
            </span>
          </li>
        ))}
        {leaders.length === 0 && <li className="p-3 text-gray-500">No leaders yet.</li>}
      </ul>
      <p className="mt-1 text-xs text-gray-400">
        Hidden leaders stay out of the dropdowns but keep their stats.
      </p>
    </div>
  )
}
