import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Board } from './types'

/**
 * The backend is optional on purpose.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, Nook has accounts,
 * boards that follow you between devices, and boards you share by link.
 * Without them it runs exactly as before — everything on this device, no sign in.
 * That keeps local development, demos and offline use working with no backend.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const backendConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** A board as it is stored: columns for what we query on, the rest as one document. */
type BoardRow = {
  id: string
  owner: string
  owner_email: string | null
  invite_token: string
  title: string
  created_at: string
  updated_at: string
  data: { pieces: Board['pieces']; members: Board['members']; color?: number }
  board_members?: { email: string; user_id: string | null; invited_at: string }[]
}

export const rowToBoard = (row: BoardRow): Board => ({
  id: row.id,
  title: row.title,
  owner: row.owner,
  ownerEmail: row.owner_email ?? undefined,
  inviteToken: row.invite_token,
  color: row.data?.color,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
  pieces: row.data?.pieces ?? [],
  members: row.data?.members ?? [],
  joined: (row.board_members ?? [])
    .filter((m) => m.user_id)
    .map((m) => ({
      email: m.email.toLowerCase(),
      userId: m.user_id!,
      at: new Date(m.invited_at).getTime(),
    })),
})

/**
 * Who is on the board comes from the membership table, never from the
 * document, so an owner's stale copy can't write someone out of it.
 */
export const boardToRow = (board: Board, owner: string) => ({
  id: board.id,
  owner,
  title: board.title,
  ...(board.inviteToken ? { invite_token: board.inviteToken } : {}),
  created_at: new Date(board.createdAt).toISOString(),
  updated_at: new Date(board.updatedAt).toISOString(),
  data: { pieces: board.pieces, members: board.members, color: board.color },
})

/** Every board you own or have been invited to. */
export async function fetchBoards(): Promise<Board[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('boards')
    .select('*, board_members(email, user_id, invited_at)')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as BoardRow[]).map(rowToBoard)
}

/** Push the whole board document. Last write wins — good enough for one household. */
export async function pushBoard(board: Board, owner: string) {
  if (!supabase) return
  const { error } = await supabase.from('boards').upsert(boardToRow(board, owner))
  if (error) throw error
}

export async function deleteBoardRow(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('boards').delete().eq('id', id)
  if (error) throw error
}

/** Redeem a board link. Returns the board id, or null if the link is no good. */
export async function joinBoard(boardId: string, token: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('join_board', { board: boardId, token })
  if (error) throw error
  return (data as string | null) ?? null
}

/** Redeem a short board link by its code alone. */
export async function joinBoardByCode(code: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('join_board_by_code', { code })
  if (error) throw error
  return (data as string | null) ?? null
}

export async function removeBoardMember(boardId: string, email: string) {
  if (!supabase) return
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('email', email)
  if (error) throw error
}

/*
 * Voice recordings live in the private "voice" bucket, filed under the board
 * they belong to, so the same membership rules decide who can hear them.
 */
export async function uploadClip(boardId: string, audioId: string, blob: Blob) {
  if (!supabase) return
  const { error } = await supabase.storage
    .from('voice')
    .upload(`${boardId}/${audioId}`, blob, { contentType: blob.type.split(';')[0] || 'audio/webm', upsert: true })
  if (error) throw error
}

export async function downloadClip(boardId: string, audioId: string): Promise<Blob | undefined> {
  if (!supabase) return undefined
  const { data, error } = await supabase.storage.from('voice').download(`${boardId}/${audioId}`)
  if (error) return undefined
  return data ?? undefined
}

/** Recordings filed under boards you own, so deleting the account leaves none behind. */
export async function removeClipsFor(boardIds: string[]) {
  if (!supabase) return
  for (const id of boardIds) {
    const { data } = await supabase.storage.from('voice').list(id, { limit: 1000 })
    if (data?.length) await supabase.storage.from('voice').remove(data.map((f) => `${id}/${f.name}`))
  }
}
