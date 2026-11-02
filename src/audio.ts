/**
 * Audio for voice notes.
 *
 * Recorded notes are real: MediaRecorder captures them, the blob goes to
 * IndexedDB (too big for localStorage) and plays back through an <audio>.
 * The seeded notes have no recording to ship, so they carry a transcript and
 * are read out by the speech synthesiser instead of playing nothing.
 */

const DB = 'nook-audio'
const STORE = 'clips'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close())
}

export const putClip = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id))
export const getClip = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id))

/** Drop recordings no board references any more, so deletes don't leak storage. */
export async function pruneClips(keep: Set<string>) {
  try {
    const keys = await tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    const orphans = keys.filter((k) => typeof k === 'string' && !keep.has(k))
    for (const key of orphans) await tx('readwrite', (s) => s.delete(key))
    return orphans.length
  } catch {
    return 0
  }
}

/** Longest recording we keep — past this the sheet stops on its own. */
export const MAX_RECORDING_SECONDS = 120

export const canRecord = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof MediaRecorder !== 'undefined'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Roughly how long a transcript takes to read aloud, at ~2.6 words a second. */
export const spokenSeconds = (text: string) =>
  Math.max(2, Math.round(text.trim().split(/\s+/).length / 2.6))

/* One clip plays at a time: starting a clip tells every other clip to stop. */
const bus = new EventTarget()

export const claimPlayback = (id: string) =>
  bus.dispatchEvent(new CustomEvent('claim', { detail: id }))

export const onPlaybackClaim = (fn: (id: string) => void) => {
  const handler = (e: Event) => fn((e as CustomEvent<string>).detail)
  bus.addEventListener('claim', handler)
  return () => bus.removeEventListener('claim', handler)
}

export type Recorder = {
  stop: () => Promise<{ blob: Blob; seconds: number; wave: number[] }>
  cancel: () => void
  /** Current input level, 0–1, for the live meter. */
  level: () => number
}

/** Starts a real microphone recording. Throws if the mic is unavailable or denied. */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) =>
    MediaRecorder.isTypeSupported(m),
  )
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  recorder.start(200)

  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  ctx.createMediaStreamSource(stream).connect(analyser)
  const buf = new Uint8Array(analyser.frequencyBinCount)

  const rms = () => {
    analyser.getByteTimeDomainData(buf)
    let sum = 0
    for (const v of buf) sum += ((v - 128) / 128) ** 2
    return Math.min(1, Math.sqrt(sum / buf.length) * 3.2)
  }

  // Sampled levels become the waveform drawn on the card.
  const samples: number[] = []
  const sampler = window.setInterval(() => samples.push(rms()), 120)
  const startedAt = performance.now()

  const teardown = () => {
    window.clearInterval(sampler)
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close()
  }

  return {
    level: rms,
    cancel: () => {
      if (recorder.state !== 'inactive') recorder.stop()
      teardown()
    },
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          teardown()
          resolve({
            blob: new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }),
            seconds: (performance.now() - startedAt) / 1000,
            wave: resample(samples, 44),
          })
        }
        recorder.stop()
      }),
  }
}

/** Squeeze however many level samples we took into a fixed number of bars. */
export function resample(values: number[], n: number): number[] {
  if (!values.length) return Array.from({ length: n }, () => 0.2)
  const step = values.length / n
  return Array.from({ length: n }, (_, i) => {
    const slice = values.slice(Math.floor(i * step), Math.max(Math.floor((i + 1) * step), Math.floor(i * step) + 1))
    const peak = Math.max(...slice)
    return Math.min(1, Math.max(0.16, peak * 0.9 + 0.12))
  })
}
