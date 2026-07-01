import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createGame, getGame, getLeaders, getPlayers, updateGame } from '../lib/api'
import type { Leader, Player, ResultInput } from '../lib/types'
import { ErrorBox, Loading } from '../components/ui'
import SearchSelect from '../components/SearchSelect'
import { placementLabel } from '../lib/format'

interface Row {
  player_id: string
  leader_id: string
}

const EMPTY: Row[] = [
  { player_id: '', leader_id: '' },
  { player_id: '', leader_id: '' },
  { player_id: '', leader_id: '' },
  { player_id: '', leader_id: '' },
]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function EnterGame() {
  const { id } = useParams() // present => edit mode
  const editing = Boolean(id)
  const navigate = useNavigate()

  const [players, setPlayers] = useState<Player[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [playedOn, setPlayedOn] = useState(today())
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Row[]>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ps, ls] = await Promise.all([getPlayers(), getLeaders()])
        const game = editing && id ? await getGame(id) : null
        if (cancelled) return
        setPlayers(ps)
        setLeaders(ls)
        if (game) {
          setPlayedOn(game.played_on.slice(0, 10))
          setNote(game.note ?? '')
          const next = EMPTY.map(() => ({ player_id: '', leader_id: '' }))
          for (const r of game.results) {
            next[r.placement - 1] = { player_id: r.player_id, leader_id: r.leader_id }
          }
          setRows(next)
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editing, id])

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (i === j ? { ...r, ...patch } : r)))
  }

  const dupPlayers = useMemo(() => findDups(rows.map((r) => r.player_id)), [rows])
  const dupLeaders = useMemo(() => findDups(rows.map((r) => r.leader_id)), [rows])

  const playerOptions = useMemo(
    () => players.map((p) => ({ id: p.id, label: p.name })),
    [players],
  )
  const leaderOptions = useMemo(
    () => leaders.map((l) => ({ id: l.id, label: l.name })),
    [leaders],
  )

  const complete = rows.every((r) => r.player_id && r.leader_id)
  const valid = complete && dupPlayers.size === 0 && dupLeaders.size === 0 && Boolean(playedOn)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setSaveError(null)
    const results: ResultInput[] = rows.map((r, i) => ({
      player_id: r.player_id,
      leader_id: r.leader_id,
      placement: i + 1,
    }))
    try {
      if (editing && id) {
        await updateGame(id, playedOn, note.trim() || null, results)
      } else {
        await createGame(playedOn, note.trim() || null, results)
      }
      navigate('/games')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (loadError) return <ErrorBox message={loadError} />

  const noPlayers = players.length < 4

  return (
    <section>
      <h1 className="mb-3 text-xl font-bold">{editing ? 'Edit game' : 'Add game'}</h1>

      {noPlayers && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          You need at least 4 players in the roster to record a game.{' '}
          <a href="/roster" className="font-medium underline">
            Add players
          </a>
          .
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">Date played</span>
            <input
              type="date"
              className="rounded border px-2 py-1.5"
              value={playedOn}
              max={today()}
              onChange={(e) => setPlayedOn(e.target.value)}
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-gray-600">Note (optional)</span>
            <input
              type="text"
              className="w-full rounded border px-2 py-1.5"
              placeholder="e.g. tense final conflict"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2 rounded border bg-white p-2">
              <span className="w-8 shrink-0 text-center text-lg" title={`${i + 1} place`}>
                {placementLabel(i + 1)}
              </span>
              <SearchSelect
                options={playerOptions}
                value={row.player_id}
                onChange={(player_id) => setRow(i, { player_id })}
                placeholder="- player -"
                invalid={dupPlayers.has(row.player_id)}
              />
              <SearchSelect
                options={leaderOptions}
                value={row.leader_id}
                onChange={(leader_id) => setRow(i, { leader_id })}
                placeholder="- leader -"
                invalid={dupLeaders.has(row.leader_id)}
              />
            </div>
          ))}
        </div>

        {(dupPlayers.size > 0 || dupLeaders.size > 0) && (
          <p className="text-sm text-red-600">
            Each player and each leader can appear only once per game.
          </p>
        )}
        {saveError && <ErrorBox message={saveError} />}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!valid || saving}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Save game'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

/** Returns the set of non-empty values that appear more than once. */
function findDups(values: string[]): Set<string> {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const v of values) {
    if (!v) continue
    if (seen.has(v)) dups.add(v)
    seen.add(v)
  }
  return dups
}
