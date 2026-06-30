import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Load .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const check = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`)
  if (!cond) process.exitCode = 1
}
const must = (res) => {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

const made = { players: [], game: null }
try {
  // 1. Seed present
  const leaders = must(await db.from('leaders').select('id,name').order('name'))
  check(leaders.length === 28, `28 leaders seeded (got ${leaders.length})`)

  // 2. Add 4 test players
  const names = ['ZZ_Alice_test', 'ZZ_Bob_test', 'ZZ_Cara_test', 'ZZ_Dan_test']
  for (const name of names) {
    const p = must(await db.from('players').insert({ name }).select().single())
    made.players.push(p)
  }
  check(made.players.length === 4, 'added 4 test players')

  // 3. create_game RPC: Alice 1st, Bob 2nd, Cara 3rd, Dan 4th
  const results = made.players.map((p, i) => ({
    player_id: p.id,
    leader_id: leaders[i].id,
    placement: i + 1,
  }))
  const gameId = must(await db.rpc('create_game', { p_played_on: '2026-06-30', p_note: 'smoke', p_results: results }))
  made.game = gameId
  check(typeof gameId === 'string', `create_game returned id (${gameId})`)

  // 4. results_detail has 4 rows for the game
  const rd = must(await db.from('results_detail').select('*').eq('game_id', gameId))
  check(rd.length === 4, `results_detail has 4 rows (got ${rd.length})`)

  // 5. player_stats: Alice should have 1 game, 1 win, winrate 1, avg 1
  const ps = must(await db.from('player_stats').select('*').eq('player_id', made.players[0].id).single())
  check(ps.games === 1 && ps.wins === 1 && Number(ps.winrate) === 1 && Number(ps.avg_placement) === 1,
    `Alice stats correct (games=${ps.games} wins=${ps.wins} wr=${ps.winrate} avg=${ps.avg_placement})`)
  const psD = must(await db.from('player_stats').select('*').eq('player_id', made.players[3].id).single())
  check(psD.wins === 0 && Number(psD.avg_placement) === 4, `Dan avg placement 4 (got ${psD.avg_placement})`)

  // 6. leader_stats for leader[0]: 1 game, 1 win
  const ls = must(await db.from('leader_stats').select('*').eq('leader_id', leaders[0].id).single())
  check(ls.games === 1 && ls.wins === 1, `leader[0] stats (games=${ls.games} wins=${ls.wins})`)

  // 7. exactly-4 enforcement: 3 results should be rejected
  const bad = await db.rpc('create_game', { p_played_on: '2026-06-30', p_note: 'bad', p_results: results.slice(0, 3) })
  check(Boolean(bad.error), `create_game rejects != 4 results (${bad.error?.message ?? 'NO ERROR'})`)

  // 8. duplicate leader in a game should be rejected by unique constraint
  const dupResults = results.map((r) => ({ ...r, leader_id: leaders[0].id }))
  const dup = await db.rpc('create_game', { p_played_on: '2026-06-30', p_note: 'dup', p_results: dupResults })
  check(Boolean(dup.error), `duplicate leader rejected (${dup.error?.message ?? 'NO ERROR'})`)

  // 9. soft delete hides from views, restore brings back
  must(await db.from('games').update({ deleted_at: new Date().toISOString() }).eq('id', gameId).select())
  const afterDel = must(await db.from('results_detail').select('*').eq('game_id', gameId))
  check(afterDel.length === 0, 'soft-deleted game vanishes from results_detail')
  must(await db.from('games').update({ deleted_at: null }).eq('id', gameId).select())
  const afterRestore = must(await db.from('results_detail').select('*').eq('game_id', gameId))
  check(afterRestore.length === 4, 'restored game reappears')

  // 10. audit log captured the game
  const audit = must(await db.from('audit_log').select('*').eq('game_id', gameId))
  check(audit.length > 0, `audit_log captured changes (${audit.length} entries)`)
} finally {
  // Cleanup: hard-delete test game (cascades results) and test players.
  if (made.game) await db.from('games').delete().eq('id', made.game)
  for (const p of made.players) await db.from('players').delete().eq('id', p.id)
  console.log('\nCleanup: removed test game and test players.')
  // Verify clean
  const left = must(await db.from('players').select('id').like('name', 'ZZ_%_test'))
  check(left.length === 0, 'no test players left behind')
  const games = must(await db.from('games').select('id'))
  check(games.length === 0, `no games left in DB (got ${games.length})`)
}
