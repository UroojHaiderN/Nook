/*
 * The four marks of the design — triangle, square, circle, flower — each in its
 * own colour. Used where the app would otherwise show an empty icon.
 */
export function Triangle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M20 4l17 30H3L20 4z" fill="rgb(var(--lime))" />
    </svg>
  )
}

export function Square({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="5" y="5" width="30" height="30" fill="rgb(var(--tomato))" />
    </svg>
  )
}

export function Circle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="rgb(var(--cobalt))" />
    </svg>
  )
}

export function Flower({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g fill="rgb(var(--lilac))">
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
