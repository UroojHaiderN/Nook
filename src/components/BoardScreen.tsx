import { useEffect, useMemo, useRef, useState } from 'react'
import ItemCard from './ItemCard'
import NoteCard from './NoteCard'
import VoiceCard from './VoiceCard'
import AddSheet from './AddSheet'
import PeopleSheet from './PeopleSheet'
import { Avatar } from './Chrome'
import { Back, PersonPlus, Plus, Search, Tune } from './Icons'
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

const matches = (p: Piece, q: string) => {
  if (!q) return true
  const t = q.toLowerCase()
  if (p.kind === 'item') return `${p.title} ${p.category} ${p.amount}`.toLowerCase().includes(t)
  if (p.kind === 'note') return `${p.label} ${p.body}`.toLowerCase().includes(t)
  return `voice note ${p.clips.map((c) => c.transcript ?? '').join(' ')}`.toLowerCase().includes(t)
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
  const { board, people, addItem, clearDone } = useBoard()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('board')
  const [viewOpen, setViewOpen] = useState(false)
  const [hideDone, setHideDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
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

  const pieces = useMemo(() => board?.pieces ?? [], [board?.pieces])

  const visible = useMemo(() => {
    const list = pieces.filter((p) => {
      if (!matches(p, query)) return false
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
  }, [pieces, query, sort, hideDone])

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

  /** What "nothing here" means depends on why it is empty. */
  const empty = query
    ? {
        title: `No “${query}” here yet`,
        body: 'Press return and it goes on the list.',
        action: { label: 'Clear search', run: () => setQuery('') },
      }
    : adjusted
      ? {
          title: 'All hidden away',
          body: 'Everything here is tucked behind the view you set.',
          action: {
            label: 'Show everything',
            run: () => {
              setHideDone(false)
              setSort('board')
            },
          },
        }
      : {
          title: 'A clean slate',
          body: 'Type what you need — “6 eggs”, “oat milk 1l” — and it lands with a picture. Or + for a note or a voice memo.',
          action: { label: 'Add the first thing', run: () => setAdding(true) },
        }

  /** The add field, drawn for a light or a dark surface. */
  const addBar = (dark: boolean) => (
    <>
      <Search className={`h-[17px] w-[17px] shrink-0 ${dark ? 'text-on-ink/50' : 'text-muted'}`} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={`I need… ${hint}`}
        aria-label="Search this board, or type something and press return to add it"
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
          aria-label="Clear search"
          className={`tap hit z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[15px] leading-none ${
            dark ? 'bg-on-ink/15 text-on-ink' : 'bg-hairline/15 text-ink'
          }`}
        >
          ×
        </button>
      )}
      <button
        onClick={() => (query.trim() ? submit() : setAdding(true))}
        aria-label={query.trim() ? `Add ${query.trim()}` : 'Add to this board'}
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
        <div className="relative mx-auto w-full max-w-5xl px-1 sm:px-0">
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

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setPeopleOpen(true)}
              aria-label={
                invited.length
                  ? `People on this board: ${invited.length + 1}`
                  : 'Invite people to this board'
              }
              className="tap grid h-11 min-w-11 place-items-center rounded-full px-1 text-ink"
            >
              {invited.length ? (
                <span className="flex -space-x-1.5">
                  {invited.slice(0, 3).map((m) => (
                    <Avatar key={m.id} person={m} size={22} ring />
                  ))}
                </span>
              ) : (
                <PersonPlus className="h-[21px] w-[21px]" />
              )}
            </button>

            <button
              onClick={() => setViewOpen((v) => !v)}
              aria-label={adjusted ? 'View options (filter on)' : 'View options'}
              aria-expanded={viewOpen}
              className={`tap -mr-2 grid h-11 w-11 place-items-center rounded-full transition-colors ${
                viewOpen || adjusted ? 'bg-ink text-on-ink' : 'text-ink'
              }`}
            >
              <Tune className="h-[21px] w-[21px]" />
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            folded ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100'
          }`}
        >
          <h1 className="mt-2 text-[36px] font-normal leading-[1.02] tracking-[-0.04em] text-ink sm:text-[48px]">
            {board.title}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {pieces.length === 0 ? 'Nothing on it yet' : `Updated ${ago(board.updatedAt)}`}
          </p>
        </div>

        {embedded && (
          <div className="mt-6 flex h-[52px] max-w-xl items-center gap-1.5 rounded-full bg-panel p-2 pl-4">
            {addBar(false)}
          </div>
        )}

        {/* One popover for how the board is shown — order and filter together. */}
        {viewOpen && (
          <div className="absolute right-0 top-[48px] z-30 w-[236px] animate-pop-in origin-top-right rounded-[20px] bg-surface p-3 shadow-lift">
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
        <div className="mx-auto w-full max-w-5xl">
        {visible.length === 0 ? (
          <div className="mt-20 flex flex-col items-center px-10 text-center">
            <ShapeCluster />
            <p className="font-display mt-6 text-[24px] font-normal tracking-[-0.03em] text-ink">{empty.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted">{empty.body}</p>
            <button
              onClick={empty.action.run}
              className="tap mt-5 rounded-full bg-ink px-6 py-3 text-[14px] text-on-ink"
            >
              {empty.action.label}
            </button>
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
                <div className="grid grid-flow-row-dense grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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
