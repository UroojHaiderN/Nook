export type NoteColor = 'amber' | 'pink' | 'mint' | 'sky' | 'lilac' | 'orchid'

export type Member = {
  id: string
  name: string
  email?: string
  tint: string
  /** Relative to whoever is looking: 'you', the board's owner, or someone who joined. */
  status: 'you' | 'owner' | 'joined' | 'invited'
  invitedAt?: number
}

/** Avatar tints, picked from the name so a person keeps the same colour. */
export const TINTS = [
  '#E8A33D',
  '#E1706F',
  '#5C7CA8',
  '#B06AA8',
  '#4FA08B',
  '#7A6FD0',
  '#C2703D',
  '#8B6B4A',
]

export const tintFor = (seed: string) => {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TINTS[hash % TINTS.length]
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

/** The display name we show for an address: "ana.gomez@work.com" → "Ana Gomez". */
export const nameFromEmail = (email: string) =>
  email
    .split('@')[0]
    .replace(/[._+-]+/g, ' ')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

/**
 * An invite needs an address — that is how the link reaches the person.
 * Anything that is not an email is rejected rather than half-added.
 */
/** Twelve lowercase letters and digits: short enough to read, too many to guess. */
export const newInviteToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
}

/** "Sunday Brunch Prep" → "sunday-brunch-prep", for the readable half of a link. */
export const slugFor = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28)
    .replace(/-+$/, '')


/** A mail draft carrying the board link, handed to the user's mail app to send. */
export type ItemPiece = {
  id: string
  kind: 'item'
  title: string
  amount: string
  qty: number
  done: boolean
  art: string
  category: string
  createdAt: number
}

export type NotePiece = {
  id: string
  kind: 'note'
  label: string
  body: string
  color: NoteColor
  authorId: string
  collaborators: string[]
  createdAt: number
  /** Freehand strokes drawn on the note, as SVG path data in a 300×240 box. */
  strokes?: string[]
}

export type VoiceClip = {
  id: string
  authorId: string
  seconds: number
  wave: number[]
  /** Key of the recording held in IndexedDB, for notes recorded on this device. */
  audioId?: string
  /** Read aloud when there is no recording to play — how the seeded notes speak. */
  transcript?: string
  /** True when a note was captured with no microphone available. */
  silent?: boolean
}

export type VoicePiece = {
  id: string
  kind: 'voice'
  clips: VoiceClip[]
  createdAt: number
}

export type Piece = ItemPiece | NotePiece | VoicePiece

export type Board = {
  id: string
  /** Supabase user id of whoever created it; absent on local-only boards. */
  owner?: string
  /** Which block colour it wears — chosen once, at creation, and kept. */
  color?: number
  /** Secret part of the board's link. Anyone holding it can join after signing in. */
  inviteToken?: string
  /** Synced boards only: the owner's address, and everyone who joined by link. */
  ownerEmail?: string
  joined?: { email: string; userId: string; at: number }[]
  title: string
  createdAt: number
  updatedAt: number
  pieces: Piece[]
  members: Member[]
}

export type SortMode = 'board' | 'todo' | 'aisle'

export const SORT_LABELS: Record<SortMode, string> = {
  board: 'Newest first',
  todo: 'Still to get',
  aisle: 'By aisle',
}

/**
 * Where a thing lives in the shop, in roughly the order you walk past it.
 *
 * This replaced a set that did not hold up: Groceries / Drinks / Household /
 * Party Supplies. Drinks *are* groceries, so an item had two right answers and
 * the filter demanded one; and "party supplies" is an occasion, which belongs
 * to the board, not the thing. Aisles are mutually exclusive and they do a job
 * — they order the list the way you actually walk the shop.
 */
export const AISLES = [
  'Produce',
  'Bakery',
  'Dairy & eggs',
  'Meat & fish',
  'Pantry',
  'Snacks',
  'Drinks',
  'Household',
  'Other',
] as const

export type Aisle = (typeof AISLES)[number]

/** Unknown aisles sort last rather than disappearing. */
export const aisleIndex = (aisle: string) => {
  const i = AISLES.indexOf(aisle as Aisle)
  return i < 0 ? AISLES.length : i
}

/* One ink on every panel: black. The panel carries the colour, the type stays put. */
/*
 * The four block colours of the design, plus its grey panel. Cobalt is the one
 * dark block, so it alone takes white type.
 */
const INK = '#111111'

/** The stored ids predate the palette; `name` is what the colour is now called. */
export const NOTE_COLORS: { id: NoteColor; name: string; dot: string; card: string; ink: string }[] = [
  { id: 'amber', name: 'Lime', dot: '#E2F16B', card: '#E2F16B', ink: INK },
  { id: 'lilac', name: 'Lilac', dot: '#DBB8F2', card: '#DBB8F2', ink: INK },
  { id: 'sky', name: 'Cobalt', dot: '#4450D6', card: '#4450D6', ink: '#FFFFFF' },
  { id: 'orchid', name: 'Tomato', dot: '#F0582F', card: '#F0582F', ink: INK },
  { id: 'mint', name: 'Grey', dot: '#F2F2F5', card: '#F2F2F5', ink: INK },
]

/** Notes saved under a colour that is no longer in the picker keep a sensible one. */
const RETIRED: Partial<Record<NoteColor, NoteColor>> = { pink: 'lilac' }

/** Block colour for a board: the same one every time, whatever its position. */
export const BOARD_BLOCKS = [
  { bg: '#E2F16B', ink: '#111111' },
  { bg: '#DBB8F2', ink: '#111111' },
  { bg: '#4450D6', ink: '#FFFFFF' },
  { bg: '#F0582F', ink: '#111111' },
] as const

/**
 * With only four colours, deriving one from the id collides all the time, so a
 * board is given the least-used colour when it is made and keeps it after that.
 */
export const nextBoardColor = (boards: { color?: number }[]) => {
  const used = BOARD_BLOCKS.map((_, i) => boards.filter((b) => b.color === i).length)
  return used.indexOf(Math.min(...used))
}

export const boardBlock = (board: { id: string; color?: number }) => {
  if (board.color !== undefined) return BOARD_BLOCKS[board.color % BOARD_BLOCKS.length]
  let hash = 0
  for (const ch of board.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return BOARD_BLOCKS[hash % BOARD_BLOCKS.length]
}

export const colorOf = (c: NoteColor) =>
  NOTE_COLORS.find((n) => n.id === (RETIRED[c] ?? c)) ?? NOTE_COLORS[0]

export const pieceName = (p: Piece) =>
  p.kind === 'item' ? p.title : p.kind === 'note' ? p.label : 'Voice note'

/** Pieces a board holds, counting quantities and each voice clip separately. */
export const countPieces = (pieces: Piece[]) =>
  pieces.reduce((n, p) => n + (p.kind === 'item' ? p.qty : p.kind === 'voice' ? p.clips.length : 1), 0)
