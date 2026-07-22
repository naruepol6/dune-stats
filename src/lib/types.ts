export interface Player {
  id: string
  name: string
  hidden: boolean
  created_at: string
}

export interface Leader {
  id: string
  name: string
  expansion: string | null
  tier: string | null
  image_url: string | null
  hidden: boolean
  created_at: string
}

/** One player's result within a game (frontend-side, before saving). */
export interface ResultInput {
  player_id: string
  leader_id: string
  placement: number // 1..4
  vp: number | null // victory points at game end; null if not recorded
}

/** A row from the results_detail view. */
export interface ResultDetail {
  id: string
  game_id: string
  played_on: string
  placement: number
  player_id: string
  player_name: string
  leader_id: string
  leader_name: string
  image_url: string | null
  vp: number | null
}

/** A game plus its 4 result rows, assembled for display. */
export interface GameWithResults {
  id: string
  played_on: string
  note: string | null
  results: ResultDetail[]
}

export interface PlayerStats {
  player_id: string
  player_name: string
  hidden: boolean
  games: number
  wins: number
  winrate: number // 0..1
  avg_placement: number | null
}

export interface LeaderStats {
  leader_id: string
  leader_name: string
  expansion: string | null
  tier: string | null
  image_url: string | null
  hidden: boolean
  games: number
  wins: number
  winrate: number // 0..1
  avg_placement: number | null
}

export interface AuditEntry {
  id: number
  table_name: string
  op: 'INSERT' | 'UPDATE' | 'DELETE'
  row_id: string | null
  game_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  at: string
}
