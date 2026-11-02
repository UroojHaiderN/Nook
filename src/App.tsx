import { useCallback, useEffect, useRef, useState } from 'react'
import PhoneFrame from './components/Chrome'
import BoardsScreen from './components/BoardsScreen'
import BoardScreen from './components/BoardScreen'
import NoteScreen from './components/NoteScreen'
import AuthScreen, { NewPasswordScreen } from './components/AuthScreen'
import Sidebar from './components/Sidebar'
import ConfettiLayer from './components/Confetti'
import { useBoard } from './store'
import { useAccount } from './auth'
import { useRoute } from './hooks'
import { hideSplash } from './splash'

/** Desktop gets room for the boards list and a board at once. */
function useWideScreen() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return wide
}

export default function App() {
  const { boards, board, firstRun, toast, openBoard } = useBoard()
  const { ready, userId, localOnly, recovering, offline } = useAccount()
  const [route, go] = useRoute()
  const wide = useWideScreen()

  // Nothing touches the address until we know who is signed in: an email link
  // arrives with its sign-in token in the hash, and it has to be read first.
  const inApp = ready && (localOnly || !!userId) && !recovering

  useEffect(() => {
    if (ready) hideSplash()
  }, [ready])

  // Signed in from #/login or #/signup: those addresses have done their job.
  useEffect(() => {
    if (inApp && /^#\/(login|signup)/.test(location.hash)) history.replaceState(null, '', '#/')
  }, [inApp])

  // A brand new install lands in its board, not on a list of one.
  const landed = useRef(false)
  useEffect(() => {
    if (!inApp || landed.current) return
    landed.current = true
    if (firstRun && !route.boardId && boards.length === 1)
      go({ boardId: boards[0].id, noteId: null }, true)
  }, [inApp, firstRun, route.boardId, boards, go])

  // The URL is the source of truth for where you are: links open where they point.
  useEffect(() => {
    if (route.boardId && route.boardId !== board?.id && boards.some((b) => b.id === route.boardId))
      openBoard(route.boardId)
  }, [route.boardId, board?.id, boards, openBoard])

  useEffect(() => {
    if (!inApp || !wide || route.boardId || !boards.length) return
    const latest = [...boards].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    go({ boardId: latest.id, noteId: null }, true)
  }, [inApp, wide, route.boardId, boards, go])

  const onBoard = !!route.boardId && boards.some((b) => b.id === route.boardId)
  const noteId = onBoard ? route.noteId : null

  const openNote = useCallback(
    (id: string | null) => go({ boardId: route.boardId, noteId: id }),
    [go, route.boardId],
  )

  // With a backend configured, nothing shows until we know who is signed in —
  // the splash covers that second, and a flash of the wrong boards would be worse.
  if (!ready) return <div className="h-full bg-canvas" />

  if (recovering)
    return (
      <PhoneFrame>
        <NewPasswordScreen />
      </PhoneFrame>
    )

  if (!localOnly && !userId)
    return (
      <PhoneFrame>
        <AuthScreen />
      </PhoneFrame>
    )

  return (
    <PhoneFrame>
      <div className="relative flex h-full overflow-hidden">
        {wide && (
          <Sidebar
            activeId={route.boardId}
            onOpen={(id) => go({ boardId: id, noteId: null })}
          />
        )}

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {onBoard ? (
            <BoardScreen
              embedded={wide}
              onOpenNote={(id) => openNote(id)}
              onBack={() => go({ boardId: null, noteId: null })}
            />
          ) : (
            <BoardsScreen embedded={wide} onOpen={(id) => go({ boardId: id, noteId: null })} />
          )}
        </div>

        {noteId && <NoteScreen noteId={noteId} onBack={() => openNote(null)} />}

        <ConfettiLayer />

        {offline && (
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+8px)] z-50 flex justify-center px-4">
            <p role="status" className="rounded-full bg-ink px-4 py-2 text-[13px] text-on-ink shadow-lift">
              Offline · changes will sync later
            </p>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--safe-bottom)+88px)] z-50 flex justify-center px-4">
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-2.5 pl-4 pr-2 text-[13px] text-on-ink shadow-lift ${
                toast.action ? 'animate-toast-long' : 'animate-toast-in'
              }`}
            >
              <span className="truncate">{toast.msg}</span>
              {toast.action && (
                <button
                  onClick={toast.action.run}
                  className="tap shrink-0 rounded-full bg-lime px-3 py-1.5 text-[12px] text-ink"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
