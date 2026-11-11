import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Back, Pen, Saved, TextBox, Trash } from './Icons'
import { useBoard } from '../store'
import { useEscape } from '../hooks'
import { NOTE_COLORS, colorOf, type NoteColor, type NotePiece } from '../types'

const W = 300
const H = 240

export default function NoteScreen({
  noteId,
  onBack: leave,
}: {
  noteId: string
  onBack: () => void
}) {
  const { board, updateNote, removePiece } = useBoard()
  const note = board?.pieces.find((p) => p.id === noteId && p.kind === 'note') as
    | NotePiece
    | undefined

  const [drawing, setDrawing] = useState(false)

  // A note closed without a word or a line on it was never really made.
  const onBack = useCallback(() => {
    if (note && !note.body.trim() && !note.strokes?.length) removePiece(note.id, { quiet: true })
    leave()
  }, [leave, note, removePiece])
  const stroke = useRef<string>('')
  const svgRef = useRef<SVGSVGElement>(null)

  useEscape(() => (drawing ? setDrawing(false) : onBack()))

  // A link to a note that no longer exists falls back to the board.
  useEffect(() => {
    if (!note) leave()
  }, [note, leave])

  if (!note) return null

  const skin = colorOf(note.color)
  const strokes = note.strokes ?? []

  const point = (e: RPointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    return [
      ((e.clientX - r.left) / r.width) * W,
      ((e.clientY - r.top) / r.height) * H,
    ].map((n) => Math.round(n * 10) / 10)
  }

  const startStroke = (e: RPointerEvent) => {
    if (!drawing) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    const [x, y] = point(e)
    stroke.current = `M${x} ${y}`
    updateNote(note.id, { strokes: [...strokes, stroke.current] })
  }

  const extendStroke = (e: RPointerEvent) => {
    if (!drawing || !stroke.current) return
    const [x, y] = point(e)
    stroke.current += ` L${x} ${y}`
    updateNote(note.id, { strokes: [...strokes.slice(0, -1), stroke.current] })
  }

  const endStroke = () => {
    stroke.current = ''
  }

  const actions = [
    {
      label: drawing ? 'Writing' : 'Draw',
      icon: <Pen className="h-[18px] w-[18px]" />,
      run: () => setDrawing((v) => !v),
      active: drawing,
    },
    {
      // Every keystroke is already saved — this just closes the note.
      label: 'Done',
      icon: <Saved className="h-[18px] w-[18px]" />,
      run: onBack,
    },
  ]

  return (
    // Phone: the note fills the screen and the controls are a sheet at the
    // bottom. Big screen: one centred column — buttons, a larger note, then the
    // controls right under it — instead of a small note lost in a sea of blur.
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-canvas/75 backdrop-blur-2xl lg:justify-center lg:bg-canvas/85">
      {/* Canvas area */}
      <div className="relative min-h-0 flex-1 overflow-hidden lg:flex-none lg:overflow-visible">
        <div className="absolute inset-x-0 top-[calc(var(--safe-top)+12px)] mx-auto flex max-w-5xl items-center justify-between px-5 sm:top-6 sm:px-8 lg:static lg:w-[560px] lg:px-0">
          <button
            onClick={onBack}
            aria-label="Back to board"
            className="tap -ml-1.5 grid h-11 w-11 place-items-center rounded-full"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full text-muted">
              <Back className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
          </button>
          <button
            onClick={() => {
              removePiece(note.id)
              onBack()
            }}
            aria-label="Delete note"
            className="tap -mr-2 grid h-11 w-11 place-items-center rounded-full text-muted hover:text-danger"
          >
            <Trash className="h-[19px] w-[19px]" />
          </button>
        </div>

        <div className="flex h-full items-center justify-center pb-16 lg:h-auto lg:py-6">
          <div
            className="relative h-[240px] w-[300px] animate-note-in rounded-[30px] shadow-sticky transition-colors duration-300 lg:h-[416px] lg:w-[520px]"
            style={{ background: skin.card, transform: 'rotate(-1deg)' }}
          >
            <div
              className="pointer-events-none absolute left-4 top-3.5 flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: skin.ink, opacity: note.body ? 0 : 0.5 }}
            >
              <TextBox className="h-[13px] w-[13px]" />
              Add text to this note
            </div>

            <textarea
              value={note.body}
              onChange={(e) => updateNote(note.id, { body: e.target.value })}
              aria-label="Note text"
              className={`h-full w-full resize-none rounded-[23px] bg-transparent px-4 pb-4 pt-[36px] text-[18px] font-normal leading-[1.4] tracking-[-0.015em] outline-none lg:px-7 lg:pt-[52px] lg:text-[24px] ${
                drawing ? 'pointer-events-none' : ''
              }`}
              style={{ color: skin.ink }}
            />

            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className={`absolute inset-0 h-full w-full rounded-[23px] ${
                drawing ? 'cursor-crosshair' : 'pointer-events-none'
              }`}
              onPointerDown={startStroke}
              onPointerMove={extendStroke}
              onPointerUp={endStroke}
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
                  opacity="0.85"
                />
              ))}
            </svg>

            {drawing && strokes.length > 0 && (
              <button
                onClick={() => updateNote(note.id, { strokes: strokes.slice(0, -1) })}
                className="tap absolute -bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-surface px-3.5 py-2 text-[12px] font-medium text-ink shadow-card"
              >
                Undo stroke
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control sheet */}
      <div className="relative z-10 mx-auto w-full max-w-xl shrink-0 animate-sheet-up rounded-t-sheet bg-surface px-4 pb-[calc(var(--safe-bottom)+20px)] pt-5 shadow-lift sm:mb-6 sm:rounded-sheet lg:mb-0 lg:w-[560px] lg:max-w-none lg:animate-pop-in lg:pb-5">
        <p className="px-1 text-[12px] font-medium text-muted">Note color</p>
        <div className="mt-2 flex items-center gap-2.5 px-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => updateNote(note.id, { color: c.id as NoteColor })}
              aria-label={`${c.name} note`}
              aria-pressed={note.color === c.id}
              className={`tap h-[22px] w-[22px] rounded-full transition-all duration-200 ${
                note.color === c.id ? 'ring-2 ring-ink/70 ring-offset-2' : 'ring-1 ring-hairline/5'
              }`}
              style={{ background: c.dot }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.run}
              className={`tap flex h-[60px] flex-col items-center justify-center gap-1.5 rounded-[20px] text-[13px] transition-colors ${
                a.active ? 'bg-cobalt text-white' : 'bg-panel text-ink'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
