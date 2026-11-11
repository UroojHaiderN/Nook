import { useEffect, useRef, useState } from 'react'
import ProductArt from './ProductArt'
import PieceMenu from './PieceMenu'
import { Plus, Tick, Trash } from './Icons'
import { useBoard } from '../store'
import { celebrateFrom } from './Confetti'
import { useEscape, useLongPress } from '../hooks'
import { AISLES, type ItemPiece } from '../types'

function EditSheet({ piece, onClose }: { piece: ItemPiece; onClose: () => void }) {
  const { updateItem, say } = useBoard()
  const [title, setTitle] = useState(piece.title)
  const [amount, setAmount] = useState(piece.amount === '1 pc' ? '' : piece.amount)
  const [category, setCategory] = useState(piece.category)
  const [qty, setQty] = useState(piece.qty)
  useEscape(onClose)

  const save = () => {
    updateItem(piece.id, { title: title.trim() || piece.title, amount: amount.trim(), category, qty })
    say('Item updated')
    onClose()
  }

  return (
    <div className="absolute inset-0 z-40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-label={`Edit ${piece.title}`}
        className="absolute inset-x-2 bottom-[calc(var(--safe-bottom)+8px)] animate-sheet-up rounded-sheet bg-surface p-5 pb-7 shadow-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-dialog-in"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline/10" />
        <p className="mb-3 text-[20px] font-semibold tracking-[-0.02em] text-ink">Edit item</p>

        <label className="mb-1.5 block px-1 text-[12px] font-medium text-muted" htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="h-12 w-full rounded-2xl bg-panel px-4 text-[16px] text-ink outline-none ring-ink/10 placeholder:text-muted focus:ring-2"
        />

        <div className="mt-3 flex gap-2">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block px-1 text-[12px] font-medium text-muted" htmlFor="edit-size">
              Size <span className="font-normal">(optional)</span>
            </label>
            <input
              id="edit-size"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="250ml"
              className="h-12 w-full rounded-2xl bg-panel px-4 text-[16px] text-ink outline-none ring-ink/10 placeholder:text-muted focus:ring-2"
            />
          </div>
          <div>
            <span className="mb-1.5 block px-1 text-[12px] font-medium text-muted">How many</span>
            <div className="flex h-12 items-center gap-1 rounded-2xl bg-panel px-1.5">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                disabled={qty <= 1}
                aria-label="One fewer"
                className="tap grid h-9 w-9 place-items-center rounded-full text-[20px] leading-none text-ink disabled:opacity-25"
              >
                −
              </button>
              <span className="w-6 text-center text-[16px] tabular-nums text-ink" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty((n) => Math.min(99, n + 1))}
                aria-label="One more"
                className="tap grid h-9 w-9 place-items-center rounded-full text-ink"
              >
                <Plus className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        <span className="mb-1.5 mt-3 block px-1 text-[12px] font-medium text-muted">Aisle</span>
        {/* Wrapped, not scrolled: all nine fit, and the one it's in is always in view. */}
        <div className="flex flex-wrap gap-1.5">
          {AISLES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`tap h-[32px] shrink-0 rounded-full px-3.5 text-[13px] transition-colors ${
                category === c ? 'bg-cobalt text-white' : 'bg-panel text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="tap h-12 flex-1 rounded-[16px] bg-panel text-[14px] text-ink"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="tap h-12 flex-1 rounded-[16px] bg-ink font-medium text-[14px] text-on-ink"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/** Said when the last thing on a board is ticked off. */
const DONE_LINES = [
  'All got. Nice shop!',
  'Basket full. Off you go.',
  'Every last thing. Legend.',
  'Done and dusted.',
  'List cleared. Go put the kettle on.',
]

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export default function ItemCard({ piece }: { piece: ItemPiece }) {
  // Cards saved before sizes were optional all say "1 pc"; that is no size at all.
  const size = piece.amount === '1 pc' ? '' : piece.amount
  const { board, toggleDone, bumpQty, removePiece, say } = useBoard()
  const [stepping, setStepping] = useState(false)
  const [cheer, setCheer] = useState(0)
  const ringRef = useRef<HTMLButtonElement>(null)

  /** Anything added in the last few seconds arrives with a little pop. */
  const [fresh] = useState(() => Date.now() - piece.createdAt < 4000)

  /*
   * Ticking something off is the thing people do most, so it is where a bit of
   * delight is worth the most: paper flies, the card gives, the item hops.
   * Un-ticking gets none of it — undoing is not an achievement.
   */
  const tick = () => {
    const finishing = !piece.done
    const lastOne =
      finishing &&
      (board?.pieces.filter((p) => p.kind === 'item' && !p.done).length ?? 0) === 1
    toggleDone(piece.id)
    if (!finishing) return
    setCheer((n) => n + 1)
    celebrateFrom(ringRef.current, lastOne)
    if (lastOne) say(pick(DONE_LINES))
  }
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const timer = useRef<number | null>(null)
  const press = useLongPress(() => setMenu(true))

  // The quantity badge unfolds into a stepper on tap, then quietly folds back.
  const keepOpen = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStepping(false), 2400)
  }
  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])

  return (
    <>
      {/*
       * One row, as in a reminders list: the box to tick, what it is, how much,
       * and a little picture. Tap the row for Edit and Delete.
       */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${piece.title}${size ? `, ${size}` : ''}. Open actions`}
        {...press.handlers}
        onClick={() => !press.consumed() && setMenu(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMenu(true)}
        className={`group/row flex min-h-[56px] cursor-pointer items-center gap-3.5 pl-4 transition-colors hover:bg-hairline/[0.025] active:bg-hairline/[0.05] ${
          fresh ? 'animate-fade-in' : ''
        }`}
      >
        <button
          ref={ringRef}
          onClick={(e) => {
            e.stopPropagation()
            tick()
          }}
          aria-label={
            piece.done ? `Mark ${piece.title} as still needed` : `Mark ${piece.title} as got`
          }
          aria-pressed={piece.done}
          className={`group/tick hit z-10 grid h-[24px] w-[24px] shrink-0 place-items-center rounded-[7px] transition-colors duration-200 ${
            piece.done
              ? `${cheer ? 'animate-check-in' : ''} bg-cobalt text-white`
              : 'border-[1.75px] border-hairline/25 text-cobalt hover:border-cobalt/60'
          }`}
        >
          {/* Empty until it's got; on a pointer, the tick previews on hover. */}
          <Tick
            className={`h-[17px] w-[17px] transition-opacity ${piece.done ? '' : 'opacity-0 group-hover/tick:opacity-40'}`}
            strokeWidth={2.6}
          />
        </button>

        {/* The divider starts after the box, as iOS lists do. */}
        <div className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 border-t border-hairline/[0.07] py-2 pr-4 group-first/row:border-t-0">
          <p
            title={piece.title}
            className={`min-w-0 flex-1 truncate text-[17px] leading-snug tracking-[-0.01em] transition-colors ${
              piece.done ? 'text-muted/80 line-through decoration-muted/60' : 'text-ink'
            }`}
          >
            {piece.title}
          </p>

          {/* The size is the quantity control: tap it to step the count. */}
          {stepping ? (
            <span className="inline-flex shrink-0 animate-pop-in items-center gap-0.5 rounded-full bg-panel px-1 py-1 text-ink">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  bumpQty(piece.id, -1)
                  keepOpen()
                }}
                aria-label="Decrease quantity"
                className="grid h-[24px] w-[24px] place-items-center rounded-full text-[16px] leading-none text-muted"
              >
                −
              </button>
              <span className="min-w-[16px] text-center font-mono text-[13px] tabular-nums">{piece.qty}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  bumpQty(piece.id, 1)
                  keepOpen()
                }}
                aria-label="Increase quantity"
                className="grid h-[24px] w-[24px] place-items-center rounded-full text-muted"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={2.4} />
              </button>
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setStepping(true)
                keepOpen()
              }}
              aria-label={`${size ? `${size}, ` : ''}quantity ${piece.qty}. Tap to change`}
              className="hit shrink-0 font-mono text-[13px] tabular-nums text-muted"
            >
              {size}
              {piece.qty > 1 && <span className={`text-ink/70 ${size ? 'ml-1.5' : ''}`}>×{piece.qty}</span>}
              {!size && piece.qty <= 1 && <span className="opacity-0 group-hover/row:opacity-50">×1</span>}
            </button>
          )}

          <ProductArt
            key={`art-${cheer}`}
            art={piece.art}
            title={piece.title}
            className={`art pointer-events-none h-[34px] w-[34px] shrink-0 origin-bottom transition-opacity duration-300 ${
              piece.done ? 'opacity-35 grayscale' : ''
            } ${cheer ? 'animate-hop' : ''}`}
          />
        </div>
      </div>

      {menu && (
        <PieceMenu
          title={piece.title}
          onClose={() => setMenu(false)}
          actions={[
            { label: 'Edit', run: () => setEditing(true) },
            {
              label: 'Delete',
              destructive: true,
              icon: <Trash className="h-[17px] w-[17px]" />,
              run: () => removePiece(piece.id),
            },
          ]}
        />
      )}

      {editing && <EditSheet piece={piece} onClose={() => setEditing(false)} />}
    </>
  )
}
