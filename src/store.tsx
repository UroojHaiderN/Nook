import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { aisleFor, artFor, seedBoards, YOU } from './seed'
import { parseItemInput } from './parse'
import { getClip, putClip, pruneClips } from './audio'
import {
  backendConfigured,
  deleteBoardRow,
  fetchBoards,
  joinBoard,
  joinBoardByCode,
  downloadClip,
  uploadClip,
  pushBoard,
  removeBoardMember,
} from './backend'
import { useAccount } from './auth'
import { nameFromEmail, newInviteToken, nextBoardColor, slugFor, tintFor } from './types'
import type { Board, Member, NoteColor, NotePiece, Piece, VoiceClip } from './types'

const KEY = 'nook.state.v4'

const uid = () => Math.random().toString(36).slice(2, 9)

type Saved = { boards: Board[]; activeId: string | null }

/**
 * A board link looks like #/join/<board-name>-<code> (older ones were
 * #/join/<board>/<token>). It is caught here, before
 * anything renders, because the person opening it is usually not signed in yet:
 * the invite waits on this device through sign-up, email confirmation included,
 * and is redeemed the moment there is an account to add to the board.
 */
const JOIN_KEY = 'nook.join.v1'
type PendingJoin = { board: string; token: string } | { code: string }

/** Fired when an invite arrives in a page that's already open. */
export const JOIN_EVENT = 'nook:invite'

/**
 * Keep an invite from the address bar. Runs once at load, and again whenever
 * the address changes — an invite pasted into a tab where Nook is already open
 * doesn't reload the page, so a load-time check alone would miss it.
 */
function captureJoin() {
  if (!backendConfigured) return
  const long = location.hash.match(/^#\/join\/([\w-]+)\/([a-z0-9]+)/i)
  const short = long ? null : location.hash.match(/^#\/join\/(?:[a-z0-9-]*-)?([a-z0-9]{8,})\/?$/i)
  if (!long && !short) return
  localStorage.setItem(
    JOIN_KEY,
    JSON.stringify(long ? { board: long[1], token: long[2] } : { code: short![1].toLowerCase() }),
  )
  history.replaceState(null, '', `${location.pathname}${location.search}#/`)
  window.dispatchEvent(new Event(JOIN_EVENT))
}
captureJoin()
window.addEventListener('hashchange', captureJoin)

/** Recordings made while offline, waiting to be shared with their board. */
const UPLOADS_KEY = 'nook.uploads.v1'
type Upload = { boardId: string; audioId: string }
const queued = (): Upload[] => {
  try {
    return JSON.parse(localStorage.getItem(UPLOADS_KEY) ?? '[]') as Upload[]
  } catch {
    return []
  }
}
const setQueued = (list: Upload[]) => localStorage.setItem(UPLOADS_KEY, JSON.stringify(list))

export const pendingJoin = (): PendingJoin | null => {
  try {
    return JSON.parse(localStorage.getItem(JOIN_KEY) ?? 'null') as PendingJoin | null
  } catch {
    return null
  }
}


/** Everyone starts with no boards; the first one is theirs to name. */
const fresh = (): Saved => {
  if (new URLSearchParams(location.search).has('demo'))
    return { boards: seedBoards, activeId: seedBoards[0].id }
  return { boards: [], activeId: null }
}

/**
 * Boards saved before aisles replaced the old four categories.
 *
 * The name is a better clue than the old label — "Groceries" was a catch-all
 * that said nothing, so milk becomes Dairy & eggs rather than Pantry. The old
 * label is only the fallback when the name gives us nothing.
 */
const LEGACY_CATEGORIES: Record<string, string> = {
  Groceries: 'Pantry',
  'Household Items': 'Household',
  'Party Supplies': 'Household',
  Drinks: 'Drinks',
}

const assignColors = (boards: Board[]) => {
  const out: Board[] = []
  for (const b of boards) out.push(b.color === undefined ? { ...b, color: nextBoardColor(out) } : b)
  return out
}

const migrate = (saved: Saved): Saved => ({
  ...saved,
  boards: assignColors(saved.boards).map((b) => ({
    ...b,
    // Links used to carry a 32-character token; anything that long is replaced.
    inviteToken: b.inviteToken && b.inviteToken.length <= 16 ? b.inviteToken : newInviteToken(),
    pieces: b.pieces.map((p) => {
      if (p.kind !== 'item' || !LEGACY_CATEGORIES[p.category]) return p
      const guess = aisleFor(p.title)
      return { ...p, category: guess === 'Other' ? LEGACY_CATEGORIES[p.category] : guess }
    }),
  })),
})

const load = (): Saved => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw) as Saved
    if (!parsed?.boards) return fresh()
    return migrate(parsed)
  } catch {
    return fresh()
  }
}

export type Toast = { id: number; msg: string; action?: { label: string; run: () => void } }

type Ctx = {
  boards: Board[]
  /** True when this browser had no saved boards before this visit. */
  firstRun: boolean
  /** Signed in, and the account's boards haven't arrived yet. */
  loading: boolean
  board: Board | null
  /** Members of the board you are looking at, as you see them: you, the owner, whoever joined. */
  people: Member[]
  toast: Toast | null
  say: (msg: string, action?: Toast['action']) => void
  openBoard: (id: string) => void
  createBoard: (title: string) => string
  renameBoard: (id: string, title: string) => void
  deleteBoard: (id: string) => void
  removeMember: (memberId: string) => void
  /** The link that lets someone join the board. */
  boardLink: (boardId: string) => string
  /** A fresh link; every one handed out before stops working. */
  resetLink: (boardId: string) => void
  /** Push a board now and say whether the server has it — a link to a board it lacks is useless. */
  saveNow: (boardId: string) => Promise<boolean>
  /** Yours to delete, or someone else's to leave. */
  isOwner: (board: Board) => boolean
  /** Deleted or left on this device just now — not a broken link. */
  wasRemovedHere: (boardId: string) => boolean
  /** Keep a recording on this device and, with an account, share it with the board. */
  storeClip: (audioId: string, blob: Blob) => Promise<void>
  /** A recording from this device, or fetched from the board and kept here. */
  loadClip: (audioId: string) => Promise<Blob | undefined>
  toggleDone: (id: string) => void
  bumpQty: (id: string, by: number) => void
  addItem: (title: string) => string
  updateItem: (
    id: string,
    patch: { title?: string; amount?: string; category?: string; qty?: number },
  ) => void
  addNote: () => string
  addVoice: (clip: {
    seconds: number
    wave?: number[]
    audioId?: string
    silent?: boolean
  }) => string
  updateNote: (id: string, patch: Partial<NotePiece>) => void
  /** `quiet` for tidying up, like an empty note closed unwritten — no toast, no undo. */
  removePiece: (id: string, opts?: { quiet?: boolean }) => void
  clearDone: () => void
  reset: () => void
}

const BoardCtx = createContext<Ctx | null>(null)

export function BoardProvider({ children }: { children: ReactNode }) {
  const { userId, email } = useAccount()
  const [firstRun] = useState(() => !localStorage.getItem(KEY))
  const [{ boards, activeId }, setState] = useState<Saved>(load)
  const pushed = useRef<Record<string, number>>({})
  const sending = useRef<Record<string, number>>({})
  const removedHere = useRef(new Set<string>())
  const wasRemovedHere = useCallback((id: string) => removedHere.current.has(id), [])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loading = backendConfigured && !!userId && loadedFor !== userId

  /* Signing out leaves nothing behind: the next person to sign in on this
     browser must not see, or inherit, the last one's boards. */
  const lastUser = useRef(userId)
  useEffect(() => {
    if (lastUser.current && !userId) {
      pushed.current = {}
      sending.current = {}
      localStorage.removeItem(KEY)
      localStorage.removeItem(JOIN_KEY)
      localStorage.removeItem(UPLOADS_KEY)
      setState({ boards: [], activeId: null })
      void pruneClips(new Set())
    }
    lastUser.current = userId
  }, [userId])
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ boards, activeId }))
  }, [boards, activeId])

  // Recordings whose voice note is gone are dead weight; clear them once on load.
  useEffect(() => {
    const used = new Set<string>()
    for (const b of boards)
      for (const p of b.pieces)
        if (p.kind === 'voice') p.clips.forEach((c) => c.audioId && used.add(c.audioId))
    void pruneClips(used)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Anything that changed since the last push goes up, once the typing stops.
     A board only counts as pushed once the server has said yes — until then a
     refresh treats it as unsaved and keeps the device copy, so a failed or
     slow save can never be overwritten by an older one. */
  useEffect(() => {
    if (!backendConfigured || !userId) return
    const timer = window.setTimeout(() => {
      for (const b of boards) {
        if (pushed.current[b.id] === b.updatedAt || sending.current[b.id] === b.updatedAt) continue
        sending.current[b.id] = b.updatedAt
        const owner = b.owner ?? userId
        void pushBoard({ ...b, owner }, owner)
          .then(() => {
            if (sending.current[b.id] === b.updatedAt) pushed.current[b.id] = b.updatedAt
          })
          .catch(() => {})
          .finally(() => {
            if (sending.current[b.id] === b.updatedAt) delete sending.current[b.id]
          })
      }
    }, 800)
    return () => window.clearTimeout(timer)
  }, [boards, userId])

  const board = boards.find((b) => b.id === activeId) ?? null

  /** On someone else's board you are one of the people who joined it. */
  const selfId = board?.owner && userId && board.owner !== userId ? `u-${userId}` : YOU.id

  const people = useMemo<Member[]>(() => {
    if (!board) return [YOU]
    if (!board.joined || !userId) return board.members
    const ownerEmail = board.ownerEmail ?? ''
    const owner: Member =
      !board.owner || board.owner === userId
        ? YOU
        : {
            id: YOU.id,
            name: nameFromEmail(ownerEmail) || 'Owner',
            email: ownerEmail || undefined,
            tint: tintFor(ownerEmail || 'owner'),
            status: 'owner',
          }
    return [
      owner,
      ...board.joined.map<Member>((j) =>
        j.userId === userId
          ? { ...YOU, id: `u-${j.userId}`, email: j.email }
          : {
              id: `u-${j.userId}`,
              name: nameFromEmail(j.email) || j.email,
              email: j.email,
              tint: tintFor(j.email),
              status: 'joined',
              invitedAt: j.at,
            },
      ),
    ]
  }, [board, userId])

  const say = useCallback((msg: string, action?: Toast['action']) => {
    setToast({ id: Date.now(), msg, action })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), action ? 4500 : 2200)
  }, [])

  const latest = useRef(boards)
  latest.current = boards

  /**
   * Bring the device up to date with the account: redeem a waiting invite,
   * take newer copies of boards, pick up boards shared with you, and let go of
   * ones you were taken off. A board with edits not yet pushed keeps them.
   * On the first pull after signing in the account wins, and anything made on
   * this device beforehand is handed over.
   */
  const pull = useCallback(
    async (initial: boolean) => {
      if (!backendConfigured || !userId) return
      let joined: string | null = null
      const invite = pendingJoin()
      if (invite) {
        try {
          joined =
            'code' in invite
              ? await joinBoardByCode(invite.code)
              : await joinBoard(invite.board, invite.token)
        } catch {
          setLoadedFor(userId)
          return // offline: keep the invite and try again on the next pull
        }
        localStorage.removeItem(JOIN_KEY)
        if (!joined) say('That link no longer works — ask for a new one')
      }

      // Anything recorded while offline goes up now.
      const waiting = queued()
      if (waiting.length) {
        const left: Upload[] = []
        for (const u of waiting) {
          const blob = await getClip(u.audioId).catch(() => undefined)
          if (!blob) continue
          try {
            await uploadClip(u.boardId, u.audioId, blob)
          } catch {
            left.push(u)
          }
        }
        setQueued(left)
      }

      let remote: Board[]
      try {
        remote = await fetchBoards()
      } catch {
        setLoadedFor(userId) // offline or misconfigured — the device copy still works
        return
      }

      const byId = new Map(remote.map((b) => [b.id, b]))
      const next: Board[] = []
      for (const local of latest.current) {
        const r = byId.get(local.id)
        const dirty = !initial && pushed.current[local.id] !== local.updatedAt
        if (r) {
          byId.delete(local.id)
          if (dirty) {
            next.push({ ...local, owner: r.owner, ownerEmail: r.ownerEmail, joined: r.joined })
          } else {
            pushed.current[r.id] = r.updatedAt
            next.push(r.color === undefined ? { ...r, color: local.color } : r)
          }
          continue
        }
        // Pushed before and now missing: deleted, or you were taken off it.
        if (pushed.current[local.id] !== undefined && !dirty) continue
        // Someone else's board the account can't see is not ours to keep.
        if (local.owner && local.owner !== userId) continue
        next.push(local.owner ? local : { ...local, owner: userId })
      }
      for (const r of byId.values()) {
        pushed.current[r.id] = r.updatedAt
        next.push(r)
      }

      const merged = assignColors(next)
      setState((s) => ({
        boards: merged,
        activeId: joined ?? (merged.some((b) => b.id === s.activeId) ? s.activeId : null),
      }))
      setLoadedFor(userId)
      if (joined) {
        location.hash = `#/b/${joined}`
        const title = merged.find((b) => b.id === joined)?.title
        say(title ? `You’re on “${title}”` : 'You’re on the board')
      }
    },
    [userId, say],
  )

  const saveNow = useCallback(
    async (boardId: string) => {
      if (!backendConfigured || !userId) return true
      const b = latest.current.find((x) => x.id === boardId)
      if (!b) return false
      if (pushed.current[b.id] === b.updatedAt) return true
      const owner = b.owner ?? userId
      try {
        await pushBoard({ ...b, owner }, owner)
        pushed.current[b.id] = b.updatedAt
        return true
      } catch {
        return false
      }
    },
    [userId],
  )

  const isOwner = useCallback((b: Board) => !b.owner || !userId || b.owner === userId, [userId])

  const storeClip = useCallback(
    async (audioId: string, blob: Blob) => {
      await putClip(audioId, blob)
      if (!backendConfigured || !userId || !activeId) return
      const boardId = activeId
      try {
        // The board has to exist upstream before a file can be filed under it.
        if (!(await saveNow(boardId))) throw new Error('board not saved')
        await uploadClip(boardId, audioId, blob)
      } catch (err) {
        setQueued([...queued(), { boardId, audioId }])
        throw err
      }
    },
    [activeId, saveNow, userId],
  )

  const loadClip = useCallback(
    async (audioId: string) => {
      const here = await getClip(audioId)
      if (here || !backendConfigured || !userId || !activeId) return here
      const blob = await downloadClip(activeId, audioId)
      if (blob) await putClip(audioId, blob)
      return blob
    },
    [activeId, userId],
  )

  // Signing in pulls once; after that, whenever you come back to the tab and
  // every so often while it is open, so a shared list keeps up with the others.
  useEffect(() => {
    if (!backendConfigured || !userId) return
    void pull(true)
    // A server that never answers shouldn't leave "Getting your boards…" up forever:
    // after a few seconds, show what this device already has.
    const patience = window.setTimeout(() => setLoadedFor(userId), 4000)
    const again = () => document.visibilityState === 'visible' && void pull(false)
    document.addEventListener('visibilitychange', again)
    const invited = () => void pull(false)
    window.addEventListener(JOIN_EVENT, invited)
    const timer = window.setInterval(again, 15_000)
    return () => {
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener(JOIN_EVENT, invited)
      window.clearInterval(timer)
      window.clearTimeout(patience)
    }
  }, [userId, pull])

  /** Every board edit stamps updatedAt, so "updated 2 days ago" stays true. */
  const patchBoard = useCallback((id: string | null, fn: (b: Board) => Board) => {
    if (!id) return
    setState((s) => ({
      ...s,
      boards: s.boards.map((b) => (b.id === id ? { ...fn(b), updatedAt: Date.now() } : b)),
    }))
  }, [])

  const patchPieces = useCallback(
    (fn: (pieces: Piece[]) => Piece[]) =>
      patchBoard(activeId, (b) => ({ ...b, pieces: fn(b.pieces) })),
    [activeId, patchBoard],
  )

  const openBoard = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), [])

  const createBoard = useCallback((title: string) => {
    const id = `board-${uid()}`
    const now = Date.now()
    setState((s) => ({
      activeId: id,
      boards: [
        {
          id,
          title: title.trim() || 'New board',
          createdAt: now,
          updatedAt: now,
          owner: userId ?? undefined,
          color: nextBoardColor(s.boards),
          inviteToken: newInviteToken(),
          pieces: [],
          members: [YOU],
        },
        ...s.boards,
      ],
    }))
    return id
  }, [userId])

  const renameBoard = useCallback(
    (id: string, title: string) => patchBoard(id, (b) => ({ ...b, title: title.trim() || b.title })),
    [patchBoard],
  )

  const deleteBoard = useCallback(
    (id: string) => {
      const gone = boards.find((b) => b.id === id)
      if (!gone) return
      removedHere.current.add(id)
      const index = boards.indexOf(gone)
      setState((s) => ({
        boards: s.boards.filter((b) => b.id !== id),
        activeId: s.activeId === id ? null : s.activeId,
      }))
      // Someone else's board: you leave it, and it stays for everyone else.
      if (backendConfigured && userId && gone.owner && gone.owner !== userId) {
        delete pushed.current[id]
        void removeBoardMember(id, email ?? '').catch(() =>
          say('Could not leave that board — try again'),
        )
        say(`Left “${gone.title}”`)
        return
      }
      if (backendConfigured && userId) void deleteBoardRow(id).catch(() => {})
      say(`Deleted “${gone.title}”`, {
        label: 'Undo',
        run: () => {
          // It was deleted upstream too, so forget that we ever pushed it —
          // otherwise the sync sees no change and the board stays gone there.
          delete pushed.current[id]
          setState((cur) => ({
            ...cur,
            boards: [...cur.boards.slice(0, index), gone, ...cur.boards.slice(index)],
          }))
        },
      })
    },
    [boards, email, say, userId],
  )

  const resetLink = useCallback(
    (boardId: string) => {
      patchBoard(boardId, (b) => ({ ...b, inviteToken: newInviteToken() }))
      say('New link made — the old one no longer works')
    },
    [patchBoard, say],
  )

  const removeMember = useCallback(
    (memberId: string) => {
      if (!board) return
      const gone = people.find((m) => m.id === memberId)
      if (!gone || gone.status === 'you' || gone.status === 'owner') return

      // Synced board: the membership row is what grants access, so that goes.
      if (board.joined && gone.email) {
        const boardId = board.id
        void removeBoardMember(boardId, gone.email)
          .then(() => pull(false))
          .catch(() => say(`Could not remove ${gone.name} — try again`))
        say(`Removed ${gone.name}`, { label: 'New link', run: () => resetLink(boardId) })
        return
      }

      const index = board.members.indexOf(gone)
      patchBoard(board.id, (b) => ({
        ...b,
        members: b.members.filter((m) => m.id !== memberId),
        // Drop them from any note they were assigned to.
        pieces: b.pieces.map((p) =>
          p.kind === 'note'
            ? { ...p, collaborators: p.collaborators.filter((c) => c !== memberId) }
            : p,
        ),
      }))
      say(`Removed ${gone.name}`, {
        label: 'Undo',
        run: () =>
          patchBoard(board.id, (b) => ({
            ...b,
            members: [...b.members.slice(0, index), gone, ...b.members.slice(index)],
          })),
      })
    },
    [board, people, patchBoard, pull, resetLink, say],
  )

  /** With accounts, the link carries the board's secret; without, it only opens it here. */
  const boardLink = useCallback(
    (boardId: string) => {
      const b = boards.find((x) => x.id === boardId)
      const base = `${location.origin}${location.pathname}`
      if (!backendConfigured || !b?.inviteToken) return `${base}#/b/${boardId}`
      const slug = slugFor(b.title)
      return `${base}#/join/${slug ? `${slug}-` : ''}${b.inviteToken}`
    },
    [boards],
  )

  const toggleDone = useCallback(
    (id: string) =>
      patchPieces((pieces) =>
        pieces.map((p) => (p.id === id && p.kind === 'item' ? { ...p, done: !p.done } : p)),
      ),
    [patchPieces],
  )

  const bumpQty = useCallback(
    (id: string, by: number) =>
      patchPieces((pieces) =>
        pieces.map((p) =>
          p.id === id && p.kind === 'item'
            ? { ...p, qty: Math.min(99, Math.max(1, p.qty + by)) }
            : p,
        ),
      ),
    [patchPieces],
  )

  const addItem = useCallback(
    (raw: string) => {
      const id = uid()
      const parsed = parseItemInput(raw)
      patchPieces((pieces) => [
        { id, kind: 'item', ...parsed, done: false, createdAt: Date.now() },
        ...pieces,
      ])
      say(`Added ${parsed.title}`)
      return id
    },
    [patchPieces, say],
  )

  const updateItem = useCallback(
    (id: string, patch: { title?: string; amount?: string; category?: string; qty?: number }) =>
      patchPieces((pieces) =>
        pieces.map((p) =>
          p.id === id && p.kind === 'item'
            ? { ...p, ...patch, art: patch.title ? artFor(patch.title) : p.art }
            : p,
        ),
      ),
    [patchPieces],
  )

  const addNote = useCallback(() => {
    const id = uid()
    patchPieces((pieces) => {
      // Number from the highest label in use, so deleting Note 2 can't mint a second one.
      const highest = pieces.reduce(
        (n, p) => (p.kind === 'note' ? Math.max(n, Number(p.label.match(/\d+/)?.[0] ?? 0)) : n),
        0,
      )
      return [
        {
          id,
          kind: 'note',
          label: `Note ${highest + 1}`,
          body: '',
          color: 'mint' as NoteColor,
          authorId: selfId,
          collaborators: [],
          createdAt: Date.now(),
        },
        ...pieces,
      ]
    })
    return id
  }, [patchPieces, selfId])

  const addVoice = useCallback<Ctx['addVoice']>(
    ({ seconds, wave, audioId, silent }) => {
      const id = uid()
      const clip: VoiceClip = {
        id: uid(),
        authorId: selfId,
        seconds: Math.max(1, seconds),
        audioId,
        silent,
        wave:
          wave ??
          Array.from({ length: 44 }, (_, i) =>
            Math.min(1, Math.max(0.16, Math.abs(Math.sin(i * 1.3 + seconds)) * 0.7 + 0.2)),
          ),
      }
      patchPieces((pieces) => [
        { id, kind: 'voice', createdAt: Date.now(), clips: [clip] },
        ...pieces,
      ])
      say(silent ? 'Voice note added (no audio)' : `Voice note added · ${Math.round(seconds)}s`)
      return id
    },
    [patchPieces, say, selfId],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<NotePiece>) =>
      patchPieces((pieces) =>
        pieces.map((p) => (p.id === id && p.kind === 'note' ? { ...p, ...patch } : p)),
      ),
    [patchPieces],
  )

  const removePiece = useCallback(
    (id: string, opts?: { quiet?: boolean }) => {
      const current = boards.find((b) => b.id === activeId)
      const index = current?.pieces.findIndex((p) => p.id === id) ?? -1
      if (index < 0 || !current) return
      const gone = current.pieces[index]
      patchPieces((pieces) => pieces.filter((p) => p.id !== id))
      if (opts?.quiet) return
      const label =
        gone.kind === 'item' ? gone.title : gone.kind === 'note' ? gone.label : 'Voice note'
      say(`Deleted ${label}`, {
        label: 'Undo',
        run: () => patchPieces((pieces) => [...pieces.slice(0, index), gone, ...pieces.slice(index)]),
      })
    },
    [activeId, boards, patchPieces, say],
  )

  const clearDone = useCallback(() => {
    const current = boards.find((b) => b.id === activeId)
    const gone = current?.pieces.filter((p) => p.kind === 'item' && p.done) ?? []
    if (!gone.length) return
    const before = current!.pieces
    patchPieces((pieces) => pieces.filter((p) => !(p.kind === 'item' && p.done)))
    say(`Cleared ${gone.length} ${gone.length === 1 ? 'item' : 'items'}`, {
      label: 'Undo',
      run: () => patchPieces(() => before),
    })
  }, [activeId, boards, patchPieces, say])

  const reset = useCallback(() => {
    localStorage.removeItem(KEY)
    setState(fresh())
    say('Boards reset')
  }, [say])

  const value = useMemo(
    () => ({
      boards,
      firstRun,
      loading,
      board,
      people,
      toast,
      say,
      openBoard,
      createBoard,
      renameBoard,
      deleteBoard,
      removeMember,
      boardLink,
      resetLink,
      saveNow,
      isOwner,
      wasRemovedHere,
      storeClip,
      loadClip,
      toggleDone,
      bumpQty,
      addItem,
      updateItem,
      addNote,
      addVoice,
      updateNote,
      removePiece,
      clearDone,
      reset,
    }),
    [
      boards,
      firstRun,
      loading,
      board,
      people,
      toast,
      say,
      openBoard,
      createBoard,
      renameBoard,
      deleteBoard,
      removeMember,
      boardLink,
      resetLink,
      saveNow,
      isOwner,
      wasRemovedHere,
      storeClip,
      loadClip,
      toggleDone,
      bumpQty,
      addItem,
      updateItem,
      addNote,
      addVoice,
      updateNote,
      removePiece,
      clearDone,
      reset,
    ],
  )

  return <BoardCtx.Provider value={value}>{children}</BoardCtx.Provider>
}

export function useBoard() {
  const ctx = useContext(BoardCtx)
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider')
  return ctx
}

/** Card-sized time: "now", "5h", "2d". The long form is for headers. */
export const agoShort = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.round(days / 30)}mo`
}

export const ago = (ts: number) => {
  const mins = Math.round((Date.now() - ts) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return `${months} ${months === 1 ? 'month' : 'months'} ago`
}

/** A hello that knows what time it is. */
export const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Evening, night owl'
}
