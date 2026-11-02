import { useEffect, useRef, useState } from 'react'
import { Basket, Mic, TextBox } from './Icons'
import { useBoard } from '../store'
import {
  canRecord,
  MAX_RECORDING_SECONDS,
  startRecording,
  type Recorder,
} from '../audio'
import { useEscape } from '../hooks'

type Mode = 'pick' | 'item' | 'voice'

const uid = () => Math.random().toString(36).slice(2, 9)

export default function AddSheet({
  onClose,
  onOpenNote,
  seedText,
  clearSeed,
}: {
  onClose: () => void
  onOpenNote: (id: string) => void
  seedText: string
  clearSeed: () => void
}) {
  const { addItem, addNote, addVoice, storeClip, say } = useBoard()
  const [mode, setMode] = useState<Mode>('pick')
  const [text, setText] = useState(seedText)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [micDenied, setMicDenied] = useState(false)
  const [arming, setArming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rec = useRef<Recorder | null>(null)

  useEffect(() => {
    if (mode === 'item') inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => {
      setElapsed((s) => Math.min(MAX_RECORDING_SECONDS, s + 0.1))
      setLevel(rec.current?.level() ?? 0)
    }, 100)
    return () => window.clearInterval(id)
  }, [recording])

  // Leaving mid-recording should not leave the microphone open.
  useEffect(() => () => rec.current?.cancel(), [])

  const beginRecording = async () => {
    setElapsed(0)
    setMicDenied(false)
    if (canRecord()) {
      try {
        setArming(true)
        rec.current = await startRecording()
        setArming(false)
        setRecording(true)
        return
      } catch {
        setMicDenied(true)
      } finally {
        setArming(false)
      }
    } else {
      setMicDenied(true)
    }
    // No microphone, no memo: a voice note nobody can hear is only clutter.
  }

  const finishRecording = async () => {
    setRecording(false)
    const recorder = rec.current
    rec.current = null
    if (!recorder) return
    try {
      const { blob, seconds, wave } = await recorder.stop()
      const audioId = uid()
      addVoice({ seconds, wave, audioId })
      // Kept here first; sharing it with the board can fail without losing it.
      void storeClip(audioId, blob).catch(() =>
        say('Saved on this device — others will hear it once it uploads'),
      )
    } catch {
      say('That recording didn’t save — try again')
    }
    onClose()
  }

  const discardRecording = () => {
    rec.current?.cancel()
    rec.current = null
    setRecording(false)
    setElapsed(0)
  }

  useEffect(() => {
    if (recording && elapsed >= MAX_RECORDING_SECONDS) void finishRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, elapsed])

  useEscape(() => (recording ? discardRecording() : mode === 'pick' ? onClose() : setMode('pick')))

  const choices = [
    {
      id: 'item' as const,
      tint: 'rgb(var(--lime))',
      label: 'Item',
      hint: 'Something to get',
      icon: <Basket className="h-[22px] w-[22px]" />,
      run: () => setMode('item'),
    },
    {
      id: 'note' as const,
      tint: 'rgb(var(--cobalt))',
      label: 'Note',
      hint: 'A reminder for the group',
      icon: <TextBox className="h-[22px] w-[22px]" />,
      run: () => {
        const id = addNote()
        onClose()
        onOpenNote(id)
      },
    },
    {
      id: 'voice' as const,
      tint: 'rgb(var(--lilac))',
      label: 'Voice',
      hint: 'Say it instead',
      icon: <Mic className="h-[22px] w-[22px]" />,
      run: () => setMode('voice'),
    },
  ]

  return (
    <div className="absolute inset-0 z-40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-label="Add to board"
        className="absolute inset-x-2 bottom-[calc(var(--safe-bottom)+8px)] animate-sheet-up rounded-sheet bg-surface p-5 pb-7 shadow-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-pop-in"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline/10" />

        {mode === 'pick' && (
          <>
            <p className="font-display mb-4 text-[24px] font-normal tracking-[-0.03em] text-ink">Add to this board</p>
            <div className="grid grid-cols-3 gap-2.5">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={c.run}
                  className="tap flex flex-col items-start gap-3 rounded-[20px] bg-panel p-3.5 text-left"
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full"
                    style={{ background: c.tint, color: c.id === 'note' ? '#fff' : '#111' }}
                  >
                    {c.icon}
                  </span>
                  <span>
                    <span className="block text-[16px] font-normal text-ink">{c.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted">
                      {c.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'item' && (
          <>
            <p className="font-display mb-4 text-[24px] font-normal tracking-[-0.03em] text-ink">What do you need?</p>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !text.trim()) return
                addItem(text)
                clearSeed()
                onClose()
              }}
              placeholder="2 rose lemonade 250ml"
              className="h-12 w-full rounded-2xl bg-panel px-4 text-[16px] text-ink outline-none ring-ink/10 placeholder:text-muted focus:ring-2"
            />
            <p className="mt-2 px-1 text-[11px] text-muted">
              Leading number sets quantity, a size like 250ml is picked up on its own.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode('pick')}
                className="tap h-11 flex-1 rounded-full bg-panel text-[15px] font-medium text-ink"
              >
                Back
              </button>
              <button
                disabled={!text.trim()}
                onClick={() => {
                  addItem(text)
                  clearSeed()
                  onClose()
                }}
                className="tap h-11 flex-1 rounded-full bg-ink text-[15px] text-on-ink disabled:opacity-30"
              >
                Add item
              </button>
            </div>
          </>
        )}

        {mode === 'voice' && (
          <>
            <p className="font-display mb-4 text-[24px] font-normal tracking-[-0.03em] text-ink">
              {recording ? 'Listening…' : arming ? 'Waiting for the microphone…' : 'Record a voice note'}
            </p>
            {/* Bars follow the real input level, so you can see the mic is live. */}
            <div className="flex h-16 items-center justify-center gap-[3px]">
              {Array.from({ length: 34 }).map((_, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-ink transition-all duration-100"
                  style={{
                    height: recording
                      ? `${6 + Math.abs(Math.sin(i * 0.9 + elapsed * 4)) * (6 + level * 40)}px`
                      : '6px',
                    opacity: recording ? 1 : 0.18,
                  }}
                />
              ))}
            </div>
            <p className="mt-1 text-center text-[14px] font-medium tabular-nums text-ink">
              {elapsed.toFixed(1)}s
              {recording && (
                <span className="font-normal text-muted"> / {MAX_RECORDING_SECONDS}s max</span>
              )}
            </p>
            {micDenied && (
              <p className="mt-1 text-center text-[12px] leading-snug text-danger">
                Nook can’t reach your microphone. Allow it for this site in your browser’s
                settings, then try again.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => (recording ? discardRecording() : setMode('pick'))}
                className="tap h-11 flex-1 rounded-full bg-panel text-[15px] font-medium text-ink"
              >
                {recording ? 'Discard' : 'Back'}
              </button>
              <button
                disabled={arming}
                onClick={() => (recording ? finishRecording() : beginRecording())}
                className="tap h-11 flex-1 rounded-full bg-ink text-[15px] text-on-ink disabled:opacity-40"
              >
                {recording ? 'Stop & add' : arming ? 'Allow access…' : micDenied ? 'Try again' : 'Start'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
