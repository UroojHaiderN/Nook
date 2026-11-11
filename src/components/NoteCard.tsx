import { useState } from 'react'
import { Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import { agoShort, useBoard } from '../store'
import { useLongPress } from '../hooks'
import { colorOf, type NotePiece } from '../types'

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
      {/* A tinted row: the colour says "note", the text is the note. */}
      <div
        role="button"
        tabIndex={0}
        {...press.handlers}
        onClick={() => !press.consumed() && onOpen(piece.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(piece.id)}
        className={`tap flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[22px] px-4 py-3 ${
          fresh ? 'animate-fade-in' : ''
        }`}
        style={{ background: skin.card }}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: skin.dot }} aria-hidden="true" />
        <p
          className="line-clamp-2 min-w-0 flex-1 text-[16px] leading-[1.35] tracking-[-0.01em]"
          style={{ color: skin.ink }}
        >
          {piece.body || (strokes.length ? 'A drawing' : 'Add text to this note')}
        </p>

        {/* Anything drawn on the note shows here too, or the row would lie about it. */}
        {strokes.length > 0 && (
          <svg
            viewBox="0 0 300 240"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-none h-[36px] w-[44px] shrink-0 rounded-lg bg-white/60"
            aria-hidden="true"
          >
            {strokes.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={skin.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        )}

        <span className="flex shrink-0 items-center gap-1.5">
          {author && author.status !== 'you' && <Avatar person={author} size={18} />}
          <span className="font-mono text-[12px]" style={{ color: skin.ink, opacity: 0.5 }}>
            {agoShort(piece.createdAt)}
          </span>
        </span>
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
