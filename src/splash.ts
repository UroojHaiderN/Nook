/**
 * The splash in index.html covers the first moment: scripts loading, and the
 * account check. It stays long enough for the shapes to land — about a second
 * from the first paint, never more — and then fades.
 */
const MIN_MS = 1100
let done = false

export function hideSplash(immediately = false) {
  if (done) return
  done = true
  const el = document.getElementById('splash')
  if (!el) return
  const wait = immediately ? 0 : Math.max(0, MIN_MS - performance.now())
  window.setTimeout(() => {
    el.classList.add('out')
    window.setTimeout(() => el.remove(), 400)
  }, wait)
}
