import { useState } from 'react'
import { Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import { agoShort, useBoard } from '../store'
import { useLongPress } from '../hooks'
import { colorOf, type NotePiece } from '../types'

/**
 * Between −1° and +1°, fixed per note. Enough to read as paper; any more and a
 * wide block of colour looks dropped rather than placed.
 */
const tiltFor = (id: string) => {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const t = ((hash % 1000) / 1000) * 2 - 1
  return `${Math.abs(t) < 0.5 ? (t < 0 ? -0.5 : 0.5) : t.toFixed(2)}deg`
}

export default function NoteCard({
  piece,
  onOpen,
}: {
  piece: NotePiece
  onOpen: (id: string) => void
}) {
  const { people, removePiece } = useBoard()
  const [menu, setMenu] = useState(false)
  const press = useLongPress(() => setMenu(true))
  const skin = colorOf(piece.color)
  const author = people.find((p) => p.id === piece.authorId)
  const strokes = piece.strokes ?? []
  const [fresh] = useState(() => Date.now() - piece.createdAt < 4000)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        {...press.handlers}
        onClick={() => !press.consumed() && onOpen(piece.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(piece.id)}
        className={`paper liftable relative flex h-[148px] cursor-pointer flex-col overflow-hidden rounded-card p-4 ${
          fresh ? 'animate-pop-in' : ''
        }`}
        style={{ background: skin.card, '--tilt': tiltFor(piece.id) } as React.CSSProperties}
      >
        {/* The paper colour says "note". Everything else is the note itself. */}
        <div className="flex items-center justify-end gap-1.5">
          {author && author.status !== 'you' && <Avatar person={author} size={16} />}
          <span className="text-[11px]" style={{ color: skin.ink, opacity: 0.45 }}>
            {agoShort(piece.createdAt)}
          </span>
        </div>

        <p
          className="mt-1.5 line-clamp-4 text-[16px] font-normal leading-[1.35] tracking-[-0.015em]"
          style={{ color: skin.ink }}
        >
          {piece.body || 'Add text to this note'}
        </p>

        {/* Anything drawn on the note shows here too, or the card would lie about it. */}
        {strokes.length > 0 && (
          <svg
            viewBox="0 0 300 240"
            preserveAspectRatio="xMidYMid slice"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
            aria-hidden="true"
          >
            {strokes.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={skin.ink}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}

      </div>

      {menu && (
        <PieceMenu
          title={piece.label}
          onClose={() => setMenu(false)}
          actions={[
            {
              label: 'Delete',
              destructive: true,
              icon: <Trash className="h-[17px] w-[17px]" />,
              run: () => removePiece(piece.id),
            },
          ]}
        />
      )}
    </>
  )
}
