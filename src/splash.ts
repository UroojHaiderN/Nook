/**
 * The splash in index.html covers the first moment: scripts loading, and the
 * account check. It stays long enough for the shapes to land — about a second
 * from the first paint, never more — and then fades.
 */
const MIN_MS = 1100
let done = false

/** Once a visit: a reload, or opening another board in a new tab, shouldn't replay it. */
const SEEN_KEY = 'nook.splash.seen'

export function hideSplash(immediately = false) {
  if (done) return
  done = true
  const el = document.getElementById('splash')
  if (!el) return
  let seen = false
  try {
    seen = sessionStorage.getItem(SEEN_KEY) === '1'
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage blocked: show it, nothing lost */
  }
  const wait = immediately || seen ? 0 : Math.max(0, MIN_MS - performance.now())
  window.setTimeout(() => {
    el.classList.add('out')
    window.setTimeout(() => el.remove(), 400)
  }, wait)
}
