import { boardBlock } from '../types'
/*
 * The four marks of the design — triangle, square, circle, flower — each in its
 * own colour. Used where the app would otherwise show an empty icon.
 */
export function Triangle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 4l17 30H3L20 4z" fill="#FCD34D" />
    </svg>
  )
}

export function Square({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="5" y="5" width="30" height="30" fill="#F87171" />
    </svg>
  )
}

export function Circle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="#6366F1" />
    </svg>
  )
}

export function Flower({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g fill="#C4B5FD">
        <circle cx="20" cy="11" r="9" />
        <circle cx="29" cy="20" r="9" />
        <circle cx="20" cy="29" r="9" />
        <circle cx="11" cy="20" r="9" />
        <circle cx="20" cy="20" r="8" />
      </g>
    </svg>
  )
}

/** All four, loosely arranged — the app's empty-state picture. */
export function ShapeCluster() {
  return (
    <div className="relative h-24 w-28" aria-hidden="true">
      <Triangle className="absolute left-0 top-1 h-12 w-12 -rotate-6" />
      <Circle className="absolute right-1 top-0 h-11 w-11" />
      <Flower className="absolute bottom-0 left-5 h-12 w-12" />
      <Square className="absolute bottom-2 right-0 h-10 w-10 rotate-12" />
    </div>
  )
}

/** A board's icon: its colour as a rounded tile, its shape drawn in white. */
export function BoardTile({ board, size = 36 }: { board: { id: string; color?: number }; size?: number }) {
  const b = boardBlock(board)
  const glyph =
    b.shape === 'tri' ? (
      <path d="M20 9l12 21H8L20 9z" fill="#fff" />
    ) : b.shape === 'square' ? (
      <rect x="11" y="11" width="18" height="18" rx="2.5" fill="#fff" />
    ) : b.shape === 'circle' ? (
      <circle cx="20" cy="20" r="9.5" fill="#fff" />
    ) : (
      <g fill="#fff">
        <circle cx="20" cy="14.5" r="5.5" />
        <circle cx="25.5" cy="20" r="5.5" />
        <circle cx="20" cy="25.5" r="5.5" />
        <circle cx="14.5" cy="20" r="5.5" />
        <circle cx="20" cy="20" r="5" />
      </g>
    )
  return (
    <span
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: b.bg }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size * 0.95} height={size * 0.95}>
        {glyph}
      </svg>
    </span>
  )
}

/** How much is left, as a ring that fills in green as things get ticked off. */
export function ProgressRing({ done, total, size = 34 }: { done: number; total: number; size?: number }) {
  const left = total - done
  const r = 15
  const c = 2 * Math.PI * r
  const k = total ? done / total : 0
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="rgb(var(--panel))" strokeWidth="3.2" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="#34C759"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${c * k} ${c}`}
          style={{ transition: 'stroke-dasharray .4s ease' }}
        />
      </svg>
      {total > 0 && left === 0 ? (
        <svg viewBox="0 0 24 24" className="absolute h-[45%] w-[45%] text-[#34C759]" aria-hidden="true">
          <path d="M5.5 12.5l4.2 4.2L18.5 7.8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="absolute font-mono text-[13px] tabular-nums text-ink/70">{left}</span>
      )}
    </span>
  )
}
