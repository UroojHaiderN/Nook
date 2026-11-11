import { useEffect, useMemo, useRef, useState } from 'react'
import ItemCard from './ItemCard'
import NoteCard from './NoteCard'
import VoiceCard from './VoiceCard'
import AddSheet from './AddSheet'
import PeopleSheet from './PeopleSheet'
import { Avatar } from './Chrome'
import { Back, Tick, More, PersonPlus, Plus, Trash, Tune } from './Icons'
import PieceMenu from './PieceMenu'
import { BoardTile, ProgressRing } from './Shapes'
import { ago, useBoard } from '../store'
import { useEscape } from '../hooks'
import { aisleIndex, SORT_LABELS, type Piece, type SortMode } from '../types'

/** Things people actually type, shown as the placeholder one at a time. */
const HINTS = ['oat milk', '6 eggs', 'sourdough', '2 lemons', 'coffee 250g', 'bin bags', 'something nice']

function useRotatingHint() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % HINTS.length), 2800)
    return () => window.clearInterval(t)
  }, [])
  return HINTS[i]
}

/** The items in one run, or — sorted by aisle — one run per aisle, in walking order. */
function groupItems(items: Piece[], sort: SortMode) {
  if (sort !== 'aisle') return items.length ? [{ heading: 'List', pieces: items }] : []
  const groups: { heading: string; pieces: Piece[] }[] = []
  for (const piece of items) {
    if (piece.kind !== 'item') continue
    const last = groups[groups.length - 1]
    if (last && last.heading === piece.category) last.pieces.push(piece)
    else groups.push({ heading: piece.category, pieces: [piece] })
  }
  return groups
}

export default function BoardScreen({
  onOpenNote,
  onBack,
  embedded = false,
}: {
  onOpenNote: (id: string) => void
  onBack: () => void
  /** Sitting beside the sidebar, where a back button points at nothing. */
  embedded?: boolean
}) {
  const { board, people, addItem, clearDone, renameBoard, deleteBoard, isOwner } = useBoard()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('board')
  const [viewOpen, setViewOpen] = useState(false)
  const [hideDone, setHideDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [boardMenu, setBoardMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  // Phone only: the large title folds into the top bar once you scroll. Two
  // thresholds, so a list just long enough to scroll doesn't flicker between.
  const [folded, setFolded] = useState(false)
  const onScroll = (e: React.UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop
    if (!folded && y > 48) setFolded(true)
    else if (folded && y < 8) setFolded(false)
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const hint = useRotatingHint()

  useEscape(() => {
    if (peopleOpen) setPeopleOpen(false)
    else if (viewOpen) setViewOpen(false)
    else if (query) setQuery('')
    else onBack()
  }, !adding)

  // "/" to start typing an item, as in most web apps with one main field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const pieces = useMemo(() => board?.pieces ?? [], [board?.pieces])

  const visible = useMemo(() => {
    const list = pieces.filter((p) => {
      if (p.kind === 'item' && hideDone && p.done) return false
      return true
    })
    const order = new Map(pieces.map((p, i) => [p.id, i]))
    const by: Record<SortMode, (a: Piece, b: Piece) => number> = {
      board: (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      todo: (a, b) => {
        const rank = (p: Piece) => (p.kind === 'item' ? (p.done ? 1 : 0) : 0.5)
        return rank(a) - rank(b) || b.createdAt - a.createdAt
      },
      /* Notes and memos first — they are instructions for the trip — then the
         things to pick up, in the order you walk past them. */
      aisle: (a, b) => {
        const rank = (p: Piece) => (p.kind === 'item' ? 1 : 0)
        if (rank(a) !== rank(b)) return rank(a) - rank(b)
        if (a.kind !== 'item' || b.kind !== 'item') return 0
        return aisleIndex(a.category) - aisleIndex(b.category) || a.title.localeCompare(b.title)
      },
    }
    return [...list].sort(by[sort])
  }, [pieces, sort, hideDone])

  if (!board) return null

  const adjusted = hideDone || sort !== 'board'
  const invited = people.filter((m) => m.status !== 'you')
  const got = pieces.filter((p) => p.kind === 'item' && p.done).length

  const submit = () => {
    const raw = query.trim()
    if (!raw) return
    addItem(raw)
    setQuery('')
    inputRef.current?.blur()
  }

  /** Tap one and it's on the list — the quickest way to see how adding works. */
  const STARTERS = ['6 eggs', 'oat milk 1l', 'sourdough', 'bananas', 'coffee 250g']

  /** Bare grey icons, as in the reference: the content is the colour. */
  const iconBtn = 'tap grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-hairline/[0.06] hover:text-ink'
  const actions = (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        onClick={() => setPeopleOpen(true)}
        aria-label={invited.length ? `Share — ${invited.length + 1} people on this board` : 'Share this board'}
        className={invited.length ? 'tap flex h-10 items-center rounded-full px-2 hover:bg-hairline/[0.06]' : iconBtn}
      >
        {invited.length ? (
          <span className="flex -space-x-1.5">
            {invited.slice(0, 3).map((m) => (
              <Avatar key={m.id} person={m} size={24} ring />
            ))}
          </span>
        ) : (
          <PersonPlus className="h-[22px] w-[22px]" />
        )}
      </button>
      <button
        onClick={() => setViewOpen((v) => !v)}
        aria-label={adjusted ? 'View options (some hidden)' : 'View options'}
        aria-expanded={viewOpen}
        className={`${iconBtn} relative ${viewOpen ? 'bg-hairline/[0.08] text-ink' : ''}`}
      >
        <Tune className="h-[22px] w-[22px]" />
        {adjusted && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cobalt ring-2 ring-canvas" />}
      </button>
      <button onClick={() => setBoardMenu(true)} aria-label="More: rename or delete this board" className={iconBtn}>
        <More className="h-[22px] w-[22px]" />
      </button>
    </div>
  )

  const saveTitle = () => {
    if (board) renameBoard(board.id, draftTitle)
    setRenaming(false)
  }

  const items = visible.filter((p) => p.kind === 'item')
  const extras = visible.filter((p) => p.kind !== 'item')
  const total = pieces.filter((p) => p.kind === 'item').length
  const left = total - got

  /** Items in one card — or, sorted by aisle, one card per aisle. */
  const groups = groupItems(items, sort)

  const label = 'px-4 pb-2 pt-6 text-[13px] font-medium text-muted'

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <header
        className={`relative z-20 shrink-0 bg-canvas/85 px-3 pb-1 backdrop-blur-xl sm:px-6 ${
          embedded ? 'pt-4' : 'pt-[calc(var(--safe-top)+8px)] sm:pt-5'
        }`}
      >
        <div className="relative mx-auto flex w-full max-w-[720px] items-center gap-2">
          {embedded ? (
            <span className="w-10" />
          ) : (
            <button onClick={onBack} aria-label="Back to boards" className={`${iconBtn} -ml-1`}>
              <Back className="h-[22px] w-[22px]" strokeWidth={2} />
            </button>
          )}
          <p
            aria-hidden={!folded}
            className={`min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.01em] text-ink transition-opacity duration-200 ${
              folded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {board.title}
          </p>
          {actions}

          {/* One popover for how the board is shown — order and filter together. */}
          {viewOpen && (
            <div className="absolute right-0 top-[46px] z-30 w-[248px] origin-top-right animate-pop-in rounded-[22px] bg-surface p-3 shadow-lift">
              <p className="px-1 pb-2 text-[12px] font-medium text-muted">Order</p>
              <div className="overflow-hidden rounded-[14px] bg-panel">
                {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSort(m)}
                    aria-pressed={sort === m}
                    className="flex w-full items-center justify-between border-t border-hairline/[0.07] px-3.5 py-2.5 text-left text-[15px] text-ink first:border-t-0"
                  >
                    {SORT_LABELS[m]}
                    {sort === m && <Tick className="h-[18px] w-[18px] text-cobalt" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setHideDone((v) => !v)}
                aria-pressed={hideDone}
                className="tap mt-2 flex w-full items-center justify-between rounded-[14px] bg-panel px-3.5 py-2.5 text-left text-[15px] text-ink"
              >
                Hide what’s got
                <span className={`relative h-[24px] w-[40px] rounded-full transition-colors ${hideDone ? 'bg-[#34C759]' : 'bg-hairline/15'}`}>
                  <span
                    className={`absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white shadow transition-all ${
                      hideDone ? 'left-[18px]' : 'left-[2px]'
                    }`}
                  />
                </span>
              </button>

              {got > 0 && (
                <button
                  onClick={() => {
                    clearDone()
                    setViewOpen(false)
                  }}
                  className="tap mt-2 w-full rounded-[14px] bg-panel py-2.5 text-[15px] text-danger"
                >
                  Clear {got} got {got === 1 ? 'item' : 'items'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main onScroll={onScroll} className="no-scrollbar flex-1 overflow-y-auto px-3 pb-[128px] pt-1 sm:px-6">
        <div className="mx-auto w-full max-w-[720px]">
          {/* The board at a glance: what it is, and how much is left. */}
          <section className="flex items-center gap-3.5 rounded-card bg-surface p-4 pr-5">
            <BoardTile board={board} size={46} />
            <div className="min-w-0 flex-1">
              {renaming ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  aria-label="Board name"
                  className="w-full rounded-xl bg-panel px-2 py-0.5 text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none"
                />
              ) : (
                <h1
                  onDoubleClick={() => {
                    setDraftTitle(board.title)
                    setRenaming(true)
                  }}
                  className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink"
                >
                  {board.title}
                </h1>
              )}
              <p className="mt-0.5 truncate text-[13px] text-muted">
                {pieces.length === 0
                  ? 'Nothing on it yet'
                  : `${total ? (left ? `${left} to get` : 'All got') : `${pieces.length} ${pieces.length === 1 ? 'note' : 'notes'}`} · Updated ${ago(board.updatedAt)}`}
              </p>
            </div>
            {total > 0 && <ProgressRing done={got} total={total} size={40} />}
          </section>

          {visible.length === 0 && adjusted ? (
            <section className="mt-4 rounded-card bg-surface p-6 text-center">
              <p className="text-[17px] font-semibold text-ink">All hidden away</p>
              <p className="mt-1 text-[14px] leading-snug text-muted">Everything here is tucked behind the view you chose.</p>
              <button
                onClick={() => {
                  setHideDone(false)
                  setSort('board')
                }}
                className="tap mt-4 rounded-full bg-ink px-5 py-2.5 text-[14px] text-on-ink"
              >
                Show everything
              </button>
            </section>
          ) : visible.length === 0 ? (
            <section className="mt-4 rounded-card bg-surface p-6">
              <p className="text-[17px] font-semibold text-ink">Start your list</p>
              <p className="mt-1 text-[15px] leading-snug text-muted">
                Type what you need in the bar below and press Enter — “6 eggs”, “oat milk 1l”. Or tap one to try it:
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => addItem(s)}
                    className="tap rounded-full bg-lav px-3.5 py-2 text-[14px] text-lav-ink"
                  >
                    + {s}
                  </button>
                ))}
              </div>
              <button onClick={() => setAdding(true)} className="mt-5 text-[14px] text-cobalt">
                Add a note or voice memo instead
              </button>
            </section>
          ) : (
            <>
              {extras.length > 0 && (
                <>
                  <h2 className={label}>Notes</h2>
                  <section className="space-y-1.5 rounded-card bg-surface p-1.5">
                    {extras.map((p) =>
                      p.kind === 'note' ? (
                        <NoteCard key={p.id} piece={p} onOpen={onOpenNote} />
                      ) : p.kind === 'voice' ? (
                        <VoiceCard key={p.id} piece={p} />
                      ) : null,
                    )}
                  </section>
                </>
              )}
              {groups.map((g) => (
                <div key={g.heading}>
                  <h2 className={label}>{g.heading}</h2>
                  <section className="overflow-hidden rounded-card bg-surface py-1">
                    {g.pieces.map((p) => p.kind === 'item' && <ItemCard key={p.id} piece={p} />)}
                  </section>
                </div>
              ))}
            </>
          )}
        </div>
      </main>

      {/* The one place to add things, floating above the thumb on every screen. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[110px] bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
      <div className="absolute inset-x-3 bottom-[calc(var(--safe-bottom)+14px)] z-20 mx-auto flex h-[58px] max-w-[560px] items-center gap-2 rounded-full bg-surface p-2 pl-5 shadow-[0_1px_2px_rgba(28,28,30,0.06),0_16px_36px_-12px_rgba(28,28,30,0.22)] ring-1 ring-hairline/[0.05] sm:inset-x-6">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Add an item — try “${hint}”`}
          aria-label="Add an item: type it and press Enter"
          className="w-full min-w-0 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted/80"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Clear"
            className="tap hit z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-hairline/15 text-[15px] leading-none text-ink"
          >
            ×
          </button>
        )}
        <button
          onClick={() => (query.trim() ? submit() : setAdding(true))}
          aria-label={query.trim() ? `Add ${query.trim()}` : 'Add a note, voice memo or item'}
          className="tap hit z-10 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[15px] bg-ink text-on-ink"
        >
          <Plus className="h-[20px] w-[20px]" strokeWidth={2.4} />
        </button>
      </div>

      {viewOpen && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setViewOpen(false)}
          className="absolute inset-0 z-10 cursor-default"
        />
      )}

      {peopleOpen && <PeopleSheet onClose={() => setPeopleOpen(false)} />}

      {boardMenu && (
        <PieceMenu
          title={board.title}
          note={
            !isOwner(board)
              ? 'Leaving takes it off your list. It stays for everyone else.'
              : board.joined?.length
                ? 'Deleting removes it for everyone on it.'
                : undefined
          }
          onClose={() => setBoardMenu(false)}
          actions={[
            {
              label: 'Rename',
              run: () => {
                setDraftTitle(board.title)
                setRenaming(true)
              },
            },
            {
              label: isOwner(board) ? 'Delete board' : 'Leave board',
              destructive: true,
              icon: <Trash className="h-[17px] w-[17px]" />,
              run: () => {
                deleteBoard(board.id)
                onBack()
              },
            },
          ]}
        />
      )}

      {adding && (
        <AddSheet
          onClose={() => setAdding(false)}
          onOpenNote={onOpenNote}
          seedText={query}
          clearSeed={() => setQuery('')}
        />
      )}
    </div>
  )
}
