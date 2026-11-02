import { useCallback, useEffect, useRef, useState } from 'react'

/** Escape closes whatever is on top — the innermost handler wins. */
const escapeStack: Array<() => void> = []

export function useEscape(onEscape: () => void, active = true) {
  const handler = useRef(onEscape)
  useEffect(() => {
    handler.current = onEscape
  })

  useEffect(() => {
    if (!active) return
    const fn = () => handler.current()
    escapeStack.push(fn)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const top = escapeStack[escapeStack.length - 1]
      if (top !== fn) return
      e.stopPropagation()
      fn()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      escapeStack.splice(escapeStack.indexOf(fn), 1)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])
}

/**
 * Press and hold — the iOS way into a context menu. Also answers a right-click,
 * and cancels if the finger moves (that's a scroll, not a press).
 */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<number | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    origin.current = null
  }, [])

  useEffect(() => clear, [clear])

  return {
    /** True when the last press turned into a long press, so click can bow out. */
    consumed: () => fired.current,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button === 2) return
        fired.current = false
        origin.current = { x: e.clientX, y: e.clientY }
        timer.current = window.setTimeout(() => {
          fired.current = true
          onLongPress()
        }, ms)
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!origin.current) return
        const moved =
          Math.abs(e.clientX - origin.current.x) + Math.abs(e.clientY - origin.current.y)
        if (moved > 10) clear()
      },
      onPointerUp: clear,
      onPointerCancel: clear,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        fired.current = true
        onLongPress()
      },
    },
  }
}

/**
 * Hash routing: `#/b/<boardId>` and `#/b/<boardId>/n/<noteId>`.
 * Deep links are what make "Copy link" worth having.
 */
export type Route = { boardId: string | null; noteId: string | null }

const parse = (hash: string): Route => {
  const m = hash.match(/^#\/b\/([^/]+)(?:\/n\/([^/]+))?/)
  return { boardId: m?.[1] ?? null, noteId: m?.[2] ?? null }
}

export const routeHash = ({ boardId, noteId }: Route) =>
  boardId ? `#/b/${boardId}${noteId ? `/n/${noteId}` : ''}` : '#/'

export function useRoute(): [Route, (next: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = useCallback((next: Route, replace = false) => {
    const hash = routeHash(next)
    if (hash === window.location.hash) return
    if (replace) window.history.replaceState(null, '', hash)
    else window.location.hash = hash
    setRoute(next)
  }, [])

  return [route, go]
}
