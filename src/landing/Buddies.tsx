import type { CSSProperties } from 'react'

/*
 * The four shapes, given faces. They are Nook's cast on the website: each one
 * bobs on its own beat and blinks now and then, so the page feels awake
 * without anything shouting.
 */

type Kind = 'tri' | 'square' | 'circle' | 'flower'
type Mood = 'happy' | 'wow' | 'wink'

const FILL: Record<Kind, string> = {
  tri: '#E2F16B',
  square: '#F0582F',
  circle: '#4450D6',
  flower: '#DBB8F2',
}

/** Where the face sits inside each shape's 100×100 box. */
const FACE: Record<Kind, { x: number; y: number; ink: string }> = {
  tri: { x: 50, y: 66, ink: '#111111' },
  square: { x: 50, y: 50, ink: '#111111' },
  circle: { x: 50, y: 50, ink: '#FFFFFF' },
  flower: { x: 50, y: 52, ink: '#111111' },
}

function Body({ kind, color }: { kind: Kind; color?: string }) {
  const fill = color ?? FILL[kind]
  if (kind === 'tri') return <path d="M50 6 L96 90 Q97 94 92 94 L8 94 Q3 94 4 90 Z" fill={fill} />
  if (kind === 'square') return <rect x="8" y="8" width="84" height="84" rx="10" fill={fill} />
  if (kind === 'circle') return <circle cx="50" cy="50" r="44" fill={fill} />
  return (
    <g fill={fill}>
      <circle cx="50" cy="26" r="24" />
      <circle cx="74" cy="50" r="24" />
      <circle cx="50" cy="74" r="24" />
      <circle cx="26" cy="50" r="24" />
      <circle cx="50" cy="50" r="22" />
    </g>
  )
}

function Face({ kind, mood }: { kind: Kind; mood: Mood }) {
  const { x, y, ink } = FACE[kind]
  return (
    <g transform={`translate(${x} ${y})`} fill={ink} stroke={ink}>
      {/* Eyes blink together, on a long loop so it reads as natural. */}
      <g className="buddy-blink" style={{ transformOrigin: '0px -6px' }}>
        {mood === 'wink' ? (
          <>
            <ellipse cx="-11" cy="-6" rx="4.2" ry="5.4" stroke="none" />
            <path d="M6 -6 q5 -5 10 0" fill="none" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="-11" cy="-6" rx="4.2" ry={mood === 'wow' ? 6.4 : 5.4} stroke="none" />
            <ellipse cx="11" cy="-6" rx="4.2" ry={mood === 'wow' ? 6.4 : 5.4} stroke="none" />
          </>
        )}
      </g>
      {mood === 'wow' ? (
        <ellipse cx="0" cy="9" rx="4.5" ry="5.5" stroke="none" />
      ) : (
        <path d="M-8 6 q8 8 16 0" fill="none" strokeWidth="3.2" strokeLinecap="round" />
      )}
      <circle cx="-19" cy="4" r="3.6" fill="#F0582F" opacity={kind === 'square' ? 0 : 0.35} stroke="none" />
      <circle cx="19" cy="4" r="3.6" fill="#F0582F" opacity={kind === 'square' ? 0 : 0.35} stroke="none" />
    </g>
  )
}

export function Buddy({
  kind,
  mood = 'happy',
  size = 96,
  delay = 0,
  className = '',
  style,
  color,
}: {
  kind: Kind
  /** For a shape sitting on its own colour — the lime triangle on a lime panel. */
  color?: string
  mood?: Mood
  size?: number
  /** Seconds — so a row of them doesn't bob in lockstep. */
  delay?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={`buddy-bob ${className}`}
      style={{ width: size, height: size, animationDelay: `${delay}s`, ...style }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <Body kind={kind} color={color} />
        <Face kind={kind} mood={mood} />
      </svg>
    </div>
  )
}
