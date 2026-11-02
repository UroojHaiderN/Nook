import { useEffect, useMemo, useRef, useState } from 'react'
import ItemCard from './ItemCard'
import NoteCard from './NoteCard'
import VoiceCard from './VoiceCard'
import AddSheet from './AddSheet'
import PeopleSheet from './PeopleSheet'
import { Avatar } from './Chrome'
import { Back, More, PersonPlus, Plus, Trash, Tune } from './Icons'
import PieceMenu from './PieceMenu'
import { ShapeCluster } from './Shapes'
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
    if (embedded) return
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

  /** Aisle order is the only view with headings; everything else is one run. */
  const sections = useMemo(() => {
    if (sort !== 'aisle') return [{ heading: null as string | null, pieces: visible }]
    const groups: { heading: string | null; pieces: Piece[] }[] = []
    for (const piece of visible) {
      const heading = piece.kind === 'item' ? piece.category : null
      const last = groups[groups.length - 1]
      if (last && last.heading === heading) last.pieces.push(piece)
      else groups.push({ heading, pieces: [piece] })
    }
    return groups
  }, [visible, sort])

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

  /** Share and view, said in words — two bare icons left people guessing. */
  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      <button
        onClick={() => setPeopleOpen(true)}
        aria-label={invited.length ? `Share — ${invited.length + 1} people on this board` : 'Share this board'}
        className="tap flex h-10 items-center gap-2 rounded-full border border-hairline/15 pl-2.5 pr-4 text-[15px] text-ink hover:border-hairline/35"
      >
        {invited.length ? (
          <span className="flex -space-x-1.5">
            {invited.slice(0, 3).map((m) => (
              <Avatar key={m.id} person={m} size={22} ring />
            ))}
          </span>
        ) : (
          <PersonPlus className="h-[19px] w-[19px]" />
        )}
        Share
      </button>
      <button
        onClick={() => setViewOpen((v) => !v)}
        aria-label={adjusted ? 'View options (some hidden)' : 'View options'}
        aria-expanded={viewOpen}
        className={`tap flex h-10 items-center gap-2 rounded-full border px-3 text-[15px] transition-colors sm:pl-3 sm:pr-4 ${
          viewOpen || adjusted ? 'border-ink bg-ink text-on-ink' : 'border-hairline/15 text-ink hover:border-hairline/35'
        }`}
      >
        <Tune className="h-[19px] w-[19px]" />
        <span className="hidden sm:inline">View</span>
      </button>
      <button
        onClick={() => setBoardMenu(true)}
        aria-label="More: rename or delete this board"
        className="tap grid h-10 w-10 place-items-center rounded-full border border-hairline/15 text-ink hover:border-hairline/35"
      >
        <More className="h-[19px] w-[19px]" />
      </button>
    </div>
  )

  const saveTitle = () => {
    if (board) renameBoard(board.id, draftTitle)
    setRenaming(false)
  }

  /** The add field, drawn for a light or a dark surface. */
  const addBar = (dark: boolean) => (
    <>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`Add an item — try “${hint}”`}
        aria-label="Add an item: type it and press Enter"
        className={`w-full min-w-0 bg-transparent text-[16px] outline-none ${
          dark ? 'text-on-ink placeholder:text-on-ink/45' : 'text-ink placeholder:text-muted'
        }`}
      />
      {query && (
        <button
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          aria-label="Clear"
          className={`tap hit z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[15px] leading-none ${
            dark ? 'bg-on-ink/15 text-on-ink' : 'bg-hairline/15 text-ink'
          }`}
        >
          ×
        </button>
      )}
      <button
        onClick={() => (query.trim() ? submit() : setAdding(true))}
        aria-label={query.trim() ? `Add ${query.trim()}` : 'Add a note, voice memo or item'}
        className={`tap hit z-10 grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full ${
          dark ? 'bg-lime text-ink' : 'bg-ink text-on-ink'
        }`}
      >
        <Plus className="h-[20px] w-[20px]" strokeWidth={2.2} />
      </button>
    </>
  )

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      {/* Header: the number you actually care about, at the size it deserves. */}
      {/* Padding outside the max width, as in the grid below, so the title, the
          field and the first card all start on the same line. */}
      <header
        className={`relative z-20 shrink-0 bg-canvas/80 px-4 pb-3 backdrop-blur-xl sm:px-8 ${
          embedded ? 'pt-7' : 'pt-[calc(var(--safe-top)+14px)] sm:pt-8'
        }`}
      >
        <div className="relative mx-auto w-full max-w-[1280px] px-1 sm:px-0">
        <div className="flex items-start justify-between gap-3">
          {embedded ? (
            <span />
          ) : (
            <>
            <button
              onClick={onBack}
              aria-label="Back to boards"
              className="tap -ml-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-on-ink">
                <Back className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
            </button>
            <p
              aria-hidden={!folded}
              className={`min-w-0 flex-1 self-center truncate text-center text-[17px] tracking-[-0.02em] text-ink transition-opacity duration-200 ${
                folded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {board.title}
            </p>
            </>
          )}

          {!embedded && actions}
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            folded ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'
          }`}
        >
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
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
                  className="font-display mt-2 w-full rounded-2xl bg-panel px-3 text-[36px] leading-[1.15] tracking-[-0.04em] text-ink outline-none sm:text-[48px]"
                />
              ) : (
                <h1
                  onDoubleClick={() => {
                    setDraftTitle(board.title)
                    setRenaming(true)
                  }}
                  className="mt-2 text-[36px] font-normal leading-[1.02] tracking-[-0.04em] text-ink sm:text-[48px]"
                >
                  {board.title}
                </h1>
              )}
              <p className="mt-1 text-[13px] text-muted">
                {pieces.length === 0 ? 'Nothing on it yet' : `Updated ${ago(board.updatedAt)}`}
              </p>
            </div>
            {embedded && <div className="pb-1">{actions}</div>}
          </div>
        </div>

        {embedded && (
          <div className="mt-6 flex h-[52px] items-center gap-1.5 rounded-full bg-panel p-2 pl-5">
            {addBar(false)}
          </div>
        )}

        {/* One popover for how the board is shown — order and filter together. */}
        {viewOpen && (
          <div className={`absolute right-0 z-30 w-[236px] ${embedded ? 'top-[84px]' : 'top-[48px]'} animate-pop-in origin-top-right rounded-[20px] bg-surface p-3 shadow-lift`}>
            <p className="pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
              Order
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSort(m)}
                  aria-pressed={sort === m}
                  className={`tap h-[30px] rounded-full border px-3.5 text-[13px] transition-colors ${
                    sort === m ? 'border-ink bg-ink text-on-ink' : 'border-hairline/20 text-ink'
                  }`}
                >
                  {SORT_LABELS[m]}
                </button>
              ))}
            </div>

            {got > 0 && (
              <button
                onClick={() => {
                  clearDone()
                  setViewOpen(false)
                }}
                className="tap mt-3 w-full rounded-full bg-panel py-2.5 text-[14px] text-danger"
              >
                Clear {got} got {got === 1 ? 'item' : 'items'}
              </button>
            )}

            <button
              onClick={() => setHideDone((v) => !v)}
              aria-pressed={hideDone}
              className="tap mt-3 flex w-full items-center justify-between py-1 text-left text-[14px] text-ink"
            >
              Hide what’s got
              <span
                className={`relative h-[20px] w-[32px] rounded-full transition-colors ${
                  hideDone ? 'bg-cobalt' : 'bg-hairline/15'
                }`}
              >
                <span
                  className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-on-block transition-all ${
                    hideDone ? 'left-[14px]' : 'left-[2px]'
                  }`}
                />
              </span>
            </button>
          </div>
        )}
        </div>
      </header>

      {/* Grid */}
      <main onScroll={onScroll} className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[120px] pt-1 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
        {visible.length === 0 && adjusted ? (
          <div className="mt-10 max-w-md px-1">
            <p className="font-display text-[24px] tracking-[-0.02em] text-ink">All hidden away</p>
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
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-8 max-w-lg px-1 sm:mt-10">
            <div className="origin-left scale-75">
              <ShapeCluster />
            </div>
            <p className="font-display mt-2 text-[26px] tracking-[-0.02em] text-ink">Start your list</p>
            <p className="mt-1 text-[15px] leading-snug text-muted">
              Type what you need {embedded ? 'in the bar above' : 'in the bar below'} and press Enter — “6 eggs”,
              “oat milk 1l”. Or tap one to try it:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => addItem(s)}
                  className="tap rounded-full border border-hairline/15 px-3.5 py-2 text-[14px] text-ink hover:border-hairline/40"
                >
                  + {s}
                </button>
              ))}
            </div>
            {!embedded && (
              <button onClick={() => setAdding(true)} className="mt-5 text-[14px] text-ink underline underline-offset-2">
                Add a note or voice memo instead
              </button>
            )}
          </div>
        ) : (
          /* One grid per section. Dense packing then tidies the holes inside a
             section without ever pulling a card under the wrong heading. */
          <div className="space-y-1">
            {sections.map((section) => (
              <section key={section.heading ?? 'top'}>
                {section.heading && (
                  <h2 className="px-1 pb-1.5 pt-4 text-[12px] font-medium text-muted">
                    {section.heading}
                  </h2>
                )}
                <div className="grid grid-flow-row-dense grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                  {section.pieces.map((p) =>
                    p.kind === 'item' ? (
                      <ItemCard key={p.id} piece={p} />
                    ) : p.kind === 'note' ? (
                      <NoteCard key={p.id} piece={p} onOpen={onOpenNote} />
                    ) : (
                      <VoiceCard key={p.id} piece={p} />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
        </div>
      </main>

      {/* One bar, two jobs: say what you need, or add something richer. On a
          phone it floats above the thumb; on a desktop it sits under the title,
          because a bar hovering over empty space is a mobile habit, not a design. */}
      {!embedded && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[120px] bg-gradient-to-t from-canvas via-canvas to-transparent" />
          <div className="absolute inset-x-4 bottom-[calc(var(--safe-bottom)+16px)] z-20 mx-auto flex h-[58px] max-w-xl items-center gap-1.5 rounded-full bg-ink p-2 pl-4 sm:inset-x-8">
            {addBar(true)}
          </div>
        </>
      )}

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
