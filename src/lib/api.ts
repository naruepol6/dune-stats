import { supabase } from './supabase'
import type {
  AuditEntry,
  GameWithResults,
  Leader,
  LeaderStats,
  Player,
  PlayerStats,
  ResultDetail,
  ResultInput,
} from './types'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---- Roster: players ------------------------------------------------------

export async function getPlayers(includeHidden = false): Promise<Player[]> {
  let q = supabase.from('players').select('*').order('name')
  if (!includeHidden) q = q.eq('hidden', false)
  return unwrap(await q)
}

export async function addPlayer(name: string): Promise<Player> {
  return unwrap(await supabase.from('players').insert({ name: name.trim() }).select().single())
}

export async function renamePlayer(id: string, name: string): Promise<void> {
  unwrap(await supabase.from('players').update({ name: name.trim() }).eq('id', id).select())
}

export async function setPlayerHidden(id: string, hidden: boolean): Promise<void> {
  unwrap(await supabase.from('players').update({ hidden }).eq('id', id).select())
}

// ---- Roster: leaders ------------------------------------------------------

export async function getLeaders(includeHidden = false): Promise<Leader[]> {
  let q = supabase.from('leaders').select('*').order('name')
  if (!includeHidden) q = q.eq('hidden', false)
  return unwrap(await q)
}

export async function addLeader(name: string, expansion?: string): Promise<Leader> {
  return unwrap(
    await supabase
      .from('leaders')
      .insert({ name: name.trim(), expansion: expansion?.trim() || null })
      .select()
      .single(),
  )
}

export async function renameLeader(id: string, name: string): Promise<void> {
  unwrap(await supabase.from('leaders').update({ name: name.trim() }).eq('id', id).select())
}

export async function setLeaderHidden(id: string, hidden: boolean): Promise<void> {
  unwrap(await supabase.from('leaders').update({ hidden }).eq('id', id).select())
}

// ---- Stats ----------------------------------------------------------------

export async function getPlayerStats(): Promise<PlayerStats[]> {
  return unwrap(await supabase.from('player_stats').select('*'))
}

export async function getLeaderStats(): Promise<LeaderStats[]> {
  return unwrap(await supabase.from('leader_stats').select('*'))
}

// ---- Games ----------------------------------------------------------------

/** Fetch active games (newest first) with their result rows assembled. */
export async function getGames(): Promise<GameWithResults[]> {
  const games = unwrap(
    await supabase
      .from('games')
      .select('id, played_on, note')
      .is('deleted_at', null)
      .order('played_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ) as { id: string; played_on: string; note: string | null }[]

  if (games.length === 0) return []

  const rows = unwrap(
    await supabase
      .from('results_detail')
      .select('*')
      .in(
        'game_id',
        games.map((g) => g.id),
      )
      .order('placement'),
  ) as ResultDetail[]

  const byGame = new Map<string, ResultDetail[]>()
  for (const r of rows) {
    const list = byGame.get(r.game_id) ?? []
    list.push(r)
    byGame.set(r.game_id, list)
  }

  return games.map((g) => ({ ...g, results: byGame.get(g.id) ?? [] }))
}

/** One active game with its result rows, or null. */
export async function getGame(gameId: string): Promise<GameWithResults | null> {
  const game = unwrap(
    await supabase
      .from('games')
      .select('id, played_on, note')
      .eq('id', gameId)
      .is('deleted_at', null)
      .maybeSingle(),
  ) as { id: string; played_on: string; note: string | null } | null
  if (!game) return null

  const results = unwrap(
    await supabase.from('results_detail').select('*').eq('game_id', gameId).order('placement'),
  ) as ResultDetail[]

  return { ...game, results }
}

/** Result rows for one player (across active games), newest first. */
export async function getPlayerResults(playerId: string): Promise<ResultDetail[]> {
  return unwrap(
    await supabase
      .from('results_detail')
      .select('*')
      .eq('player_id', playerId)
      .order('played_on', { ascending: false }),
  )
}

/** Result rows for one leader (across active games), newest first. */
export async function getLeaderResults(leaderId: string): Promise<ResultDetail[]> {
  return unwrap(
    await supabase
      .from('results_detail')
      .select('*')
      .eq('leader_id', leaderId)
      .order('played_on', { ascending: false }),
  )
}

export async function createGame(
  playedOn: string,
  note: string | null,
  results: ResultInput[],
): Promise<string> {
  const data = unwrap(
    await supabase.rpc('create_game', {
      p_played_on: playedOn,
      p_note: note,
      p_results: results,
    }),
  )
  return data as unknown as string
}

export async function updateGame(
  gameId: string,
  playedOn: string,
  note: string | null,
  results: ResultInput[],
): Promise<void> {
  unwrap(
    await supabase.rpc('update_game', {
      p_game_id: gameId,
      p_played_on: playedOn,
      p_note: note,
      p_results: results,
    }),
  )
}

export async function softDeleteGame(gameId: string): Promise<void> {
  unwrap(
    await supabase
      .from('games')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', gameId)
      .select(),
  )
}

export async function restoreGame(gameId: string): Promise<void> {
  unwrap(await supabase.from('games').update({ deleted_at: null }).eq('id', gameId).select())
}

// ---- Audit / edit history -------------------------------------------------

export async function getGameHistory(gameId: string): Promise<AuditEntry[]> {
  return unwrap(
    await supabase
      .from('audit_log')
      .select('*')
      .eq('game_id', gameId)
      .order('at', { ascending: false }),
  )
}
