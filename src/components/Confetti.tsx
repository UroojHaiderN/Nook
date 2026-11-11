import { useEffect, useState } from 'react'

/*
 * A little burst of paper when you tick something off. It lives in one fixed
 * layer over the whole app rather than inside the card, because cards clip
 * their overflow and confetti that stops at a card edge is not confetti.
 *
 * The colours are the note papers already in the app — nothing new, just the
 * same pastels flying about.
 */
const PAPERS = ['#FCD34D', '#A78BFA', '#6366F1', '#F87171', '#34D399']

type Piece = {
  dx: number
  dy: number
  spin: number
  w: number
  h: number
  delay: number
  color: string
}

type Burst = { id: number; x: number; y: number; pieces: Piece[] }

/*
 * The dice are rolled once, when a burst is thrown. Rolling them during render
 * would reshuffle every piece if anything re-rendered mid-flight.
 */
const roll = (big: boolean): Piece[] => {
  const count = big ? 42 : 14
  const reach = big ? 220 : 70
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6
    const distance = reach * (0.55 + Math.random() * 0.6)
    const size = big ? 6 + Math.random() * 6 : 5 + Math.random() * 4
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance + (big ? 60 : 18),
      spin: (Math.random() - 0.5) * 540,
      w: size,
      h: size * (Math.random() > 0.5 ? 1 : 0.5),
      delay: Math.random() * 60,
      color: PAPERS[i % PAPERS.length],
    }
  })
}

const bus = new EventTarget()

/** Throw confetti from a point on screen. `big` is for finishing a whole list. */
export function celebrate(x: number, y: number, big = false) {
  bus.dispatchEvent(new CustomEvent('burst', { detail: { x, y, big } }))
}

/** Convenience: throw it from the middle of an element. */
export function celebrateFrom(el: Element | null, big = false) {
  if (!el) return
  const r = el.getBoundingClientRect()
  celebrate(r.left + r.width / 2, r.top + r.height / 2, big)
}

function Pieces({ burst }: { burst: Burst }) {
  return (
    <>
      {burst.pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute animate-confetti rounded-[2px]"
          style={
            {
              left: burst.x,
              top: burst.y,
              width: piece.w,
              height: piece.h,
              background: piece.color,
              '--dx': `${piece.dx}px`,
              '--dy': `${piece.dy}px`,
              '--spin': `${piece.spin}deg`,
              animationDelay: `${piece.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}

export default function ConfettiLayer() {
  const [bursts, setBursts] = useState<Burst[]>([])

  useEffect(() => {
    // Nobody who has asked for less motion gets paper thrown at them.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onBurst = (e: Event) => {
      if (calm.matches) return
      const { x, y, big } = (e as CustomEvent<{ x: number; y: number; big: boolean }>).detail
      const id = Date.now() + Math.random()
      setBursts((b) => [...b, { id, x, y, pieces: roll(big) }])
      window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100)
    }
    bus.addEventListener('burst', onBurst)
    return () => bus.removeEventListener('burst', onBurst)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bursts.map((b) => (
        <Pieces key={b.id} burst={b} />
      ))}
    </div>
  )
}
