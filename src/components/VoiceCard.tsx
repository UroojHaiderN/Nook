import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import { useLongPress } from '../hooks'
import { useBoard } from '../store'
import { canSpeak, claimPlayback, onPlaybackClaim } from '../audio'
import type { Member, VoiceClip, VoicePiece } from '../types'

/** 0:16, 1:04 — how a phone shows a clip's length. */
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function Clip({ clip, person }: { clip: VoiceClip; person?: Member }) {
  const { say, loadClip } = useBoard()
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const audio = useRef<HTMLAudioElement | null>(null)
  const objectUrl = useRef<string | null>(null)
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  /** How far into the transcript the synthesiser got, so pause can resume there. */
  const spokenTo = useRef(0)
  const raf = useRef<number | null>(null)
  const sweepFrom = useRef(0)
  const sweepStart = useRef(0)

  const stopSweep = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = null
  }, [])

  /** Drives the waveform for speech, which cannot report its own position. */
  const sweep = useCallback(
    (seconds: number, from = 0) => {
      stopSweep()
      sweepFrom.current = from
      sweepStart.current = performance.now()
      const tick = (t: number) => {
        const p = sweepFrom.current + (t - sweepStart.current) / (seconds * 1000)
        setProgress(Math.min(p, 0.995))
        if (p < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    },
    [stopSweep],
  )

  /**
   * Chrome's speechSynthesis.pause() is unreliable — on several platforms the
   * voice simply carries on talking. Cancelling is the only thing that really
   * stops it, so pause cancels and remembers the word it reached.
   */
  const silenceSpeech = useCallback(() => {
    const u = utterance.current
    if (!u || !canSpeak()) return
    // Detach first: cancel() fires onend, which would otherwise reset progress.
    u.onend = null
    u.onboundary = null
    utterance.current = null
    window.speechSynthesis.cancel()
  }, [])

  const pause = useCallback(() => {
    stopSweep()
    audio.current?.pause()
    silenceSpeech()
    setPlaying(false)
  }, [silenceSpeech, stopSweep])

  /** Back to the start: used when the clip ends or another one takes over. */
  const rewind = useCallback(() => {
    stopSweep()
    silenceSpeech()
    if (audio.current) {
      audio.current.pause()
      audio.current.currentTime = 0
    }
    spokenTo.current = 0
    setProgress(0)
    setPlaying(false)
  }, [silenceSpeech, stopSweep])

  // Another clip started: yield to it.
  useEffect(() => onPlaybackClaim((id) => id !== clip.id && rewind()), [clip.id, rewind])

  useEffect(
    () => () => {
      stopSweep()
      if (canSpeak()) window.speechSynthesis.cancel()
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [stopSweep],
  )

  const playRecording = async () => {
    if (!audio.current) {
      const blob = await loadClip(clip.audioId!)
      if (!blob) return false
      objectUrl.current = URL.createObjectURL(blob)
      const el = new Audio(objectUrl.current)
      el.onended = rewind
      el.ontimeupdate = () => {
        const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : clip.seconds
        setProgress(Math.min(el.currentTime / total, 0.999))
      }
      audio.current = el
    }
    await audio.current.play()
    return true
  }

  const speak = () => {
    const text = clip.transcript!
    const offset = spokenTo.current
    const synth = window.speechSynthesis
    synth.cancel() // clear anything Chrome still has queued

    const u = new SpeechSynthesisUtterance(text.slice(offset))
    u.rate = 1
    u.onboundary = (e) => {
      if (!e.charIndex) return
      spokenTo.current = offset + e.charIndex
      setProgress(Math.min(spokenTo.current / text.length, 0.995))
    }
    u.onend = () => {
      utterance.current = null
      rewind()
    }
    utterance.current = u
    synth.speak(u)
    sweep(clip.seconds, offset / text.length)
  }

  const toggle = async () => {
    if (playing) {
      pause()
      return
    }

    claimPlayback(clip.id)
    setPlaying(true)

    if (clip.audioId) {
      try {
        if (await playRecording()) return
      } catch {
        /* fall through to the silent sweep */
      }
    }

    if (clip.transcript && canSpeak()) {
      speak()
      return
    }

    if (clip.silent) say('This note was saved without audio')
    sweep(clip.seconds, progress)
  }

  const elapsed = progress > 0 ? clip.seconds * progress : clip.seconds

  return (
    <div className="flex h-11 shrink-0 items-center gap-2.5">
      {person && person.status !== 'you' && <Avatar person={person} size={26} />}
      <button
        onClick={toggle}
        aria-label={`${playing ? 'Pause' : 'Play'} voice note from ${person?.name ?? 'someone'}`}
        className="tap -m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full"
      >
        <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-ink text-on-ink">
          {playing ? <Pause className="h-[15px] w-[15px]" /> : <Play className="h-[15px] w-[15px]" />}
        </span>
      </button>

      <div className="flex h-7 flex-1 items-center justify-between gap-[2px] overflow-hidden">
        {clip.wave.map((h, i) => {
          const passed = progress > 0 && (i + 1) / clip.wave.length <= progress
          const head = Math.floor(progress * clip.wave.length)
          const alive = playing && i >= head && i < head + 4
          return (
            <span
              key={i}
              className={`w-[2px] shrink-0 origin-center rounded-full transition-colors duration-150 ${
                passed ? 'bg-cobalt' : 'bg-wave'
              } ${alive ? 'animate-breathe bg-cobalt/60' : ''}`}
              style={{
                height: `${Math.round(h * 26)}px`,
                animationDelay: alive ? `${(i - head) * 90}ms` : undefined,
              }}
            />
          )
        })}
      </div>

      <span
        className={`w-[44px] shrink-0 text-right text-[13px] tabular-nums ${
          clip.silent ? 'text-muted/50' : 'text-ink'
        }`}
        title={clip.silent ? 'Saved without audio' : clip.transcript}
      >
        {mmss(elapsed)}
      </span>
    </div>
  )
}

export default function VoiceCard({ piece }: { piece: VoicePiece }) {
  const { people, removePiece } = useBoard()
  const [menu, setMenu] = useState(false)
  const press = useLongPress(() => setMenu(true))

  return (
    <>
      <div
        {...press.handlers}
        className="liftable col-span-2 flex flex-col justify-center gap-1 rounded-card border border-hairline/[0.14] bg-surface px-4 py-2.5 sm:px-5"
      >
        {piece.clips.map((clip) => (
          <Clip key={clip.id} clip={clip} person={people.find((p) => p.id === clip.authorId)} />
        ))}
      </div>

      {menu && (
        <PieceMenu
          title={piece.clips.length > 1 ? `${piece.clips.length} voice notes` : 'Voice note'}
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
