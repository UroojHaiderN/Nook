import { useEffect, useRef, useState } from 'react'
import ProductArt from './ProductArt'
import PieceMenu from './PieceMenu'
import { Check, Plus, Trash } from './Icons'
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
        className="absolute inset-x-2 bottom-[calc(var(--safe-bottom)+8px)] animate-sheet-up rounded-sheet bg-surface p-5 pb-7 shadow-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-pop-in"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline/10" />
        <p className="font-display mb-3 text-[22px] font-normal tracking-[-0.03em] text-ink">Edit item</p>

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
              className={`tap h-[30px] shrink-0 rounded-full border px-3 text-[13px] transition-colors ${
                category === c ? 'border-ink bg-ink text-on-ink' : 'border-hairline/15 text-ink'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="tap h-11 flex-1 rounded-full bg-panel text-[14px] text-ink"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="tap h-11 flex-1 rounded-full bg-ink text-[14px] text-on-ink"
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
       * Four things and no more: what it is, how much, one tap to tick it off,
       * and a picture. Quantity is text — the black badge it used to be collided
       * with the illustration and added a control nobody asked for.
       */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`${piece.title}${size ? `, ${size}` : ''}. Open actions`}
        {...press.handlers}
        onClick={() => !press.consumed() && setMenu(true)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setMenu(true)}
        key={`card-${cheer}`}
        className={`tap liftable relative flex h-[148px] cursor-pointer flex-col overflow-hidden rounded-card border border-hairline/[0.14] bg-surface p-4 ${
          cheer ? 'animate-squish' : fresh ? 'animate-pop-in' : ''
        }`}
      >
        <p
          className={`pr-1 text-[17px] font-normal leading-[1.2] tracking-[-0.02em] ${
            piece.done ? 'text-muted line-through decoration-muted/70' : 'text-ink'
          }`}
        >
          {piece.title}
        </p>

        {/* The size line is the quantity control. "×1" says nothing, so it only
            appears once there is more than one — but the tap target stays. */}
        <div className="mt-1 text-[13px]">
          {stepping ? (
            <span className="inline-flex animate-pop-in items-center gap-0.5 rounded-full bg-ink px-1 py-0.5 text-on-ink">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  bumpQty(piece.id, -1)
                  keepOpen()
                }}
                aria-label="Decrease quantity"
                className="grid h-[18px] w-[18px] place-items-center rounded-full text-[14px] leading-none opacity-70"
              >
                −
              </button>
              <span className="min-w-[12px] text-center text-[11px] font-medium tabular-nums">
                {piece.qty}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  bumpQty(piece.id, 1)
                  keepOpen()
                }}
                aria-label="Increase quantity"
                className="grid h-[18px] w-[18px] place-items-center rounded-full"
              >
                <Plus className="h-[11px] w-[11px]" strokeWidth={2.6} />
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
              className="text-muted"
            >
              {size}
              {(piece.qty > 1 || !size) && (
                <span
                  className={`tabular-nums ${size ? 'ml-1.5' : ''} ${
                    piece.qty > 1 ? 'font-medium text-ink/70' : 'text-muted/60'
                  }`}
                >
                  ×{piece.qty}
                </span>
              )}
            </button>
          )}
        </div>

        <ProductArt
          key={`art-${cheer}`}
          art={piece.art}
          title={piece.title}
          className={`art pointer-events-none absolute bottom-2 right-2 h-[76px] w-[76px] origin-bottom transition-opacity duration-300 ${
            piece.done ? 'opacity-30' : ''
          } ${cheer ? 'animate-hop' : ''}`}
        />

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
          className={`group/tick tap hit z-10 absolute bottom-3.5 left-3.5 grid h-[32px] w-[32px] place-items-center rounded-full transition-colors duration-200 ${
            piece.done
              ? 'animate-check-in bg-cobalt text-on-ink'
              : 'border-[1.5px] border-hairline/25 text-ink hover:border-hairline/50'
          }`}
        >
          {/* An empty ring until it's got — a tick inside an unticked box reads as done.
              On a pointer, the tick previews on hover. */}
          <Check
            className={`h-[23px] w-[23px] transition-opacity ${
              piece.done ? '' : 'opacity-0 group-hover/tick:opacity-30'
            }`}
            strokeWidth={2}
          />
        </button>
      </div>

      {menu && (
        <PieceMenu
          title={piece.title}
          onClose={() => setMenu(false)}
          actions={[
            { label: 'Edit', run: () => setEditing(true) },
            {
              label: piece.done ? 'Mark as still needed' : 'Mark as got',
              run: tick,
            },
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
