// Records Nook's demo scenes as high-quality frame sequences (CDP screencast),
// one folder per scene, each frame stamped with its capture time.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'scenes')
const APP = 'http://localhost:5174'
// Recorded at 4K. The page runs SLOW times slower than real life, so the
// screencast (which only manages ~12 fps at 4K) still catches 30+ fps of the
// app's own time; build.py speeds the footage back up by the same factor.
const W = 3840
const H = 2160
const SLOW = 3
const ZOOM = 2.7 // the app at 1.35x its desktop size, at 2x pixel density
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SLOW))

/* Slows the page's own clock: timers, Date, performance.now and rAF. */
const SLOW_CLOCK = `(() => {
  const K = ${SLOW}
  const realNow = performance.now.bind(performance)
  const realDate = Date.now
  const t0 = realNow(), d0 = realDate()
  performance.now = () => t0 + (realNow() - t0) / K
  Date.now = () => d0 + (realDate() - d0) / K
  const st = window.setTimeout, si = window.setInterval
  window.setTimeout = (fn, ms = 0, ...a) => st(fn, ms * K, ...a)
  window.setInterval = (fn, ms = 0, ...a) => si(fn, ms * K, ...a)
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()))
})()`

/* A visible cursor, since a headless browser has none. Animated on the page's
   own (slowed) clock rather than with CSS transitions, so it glides smoothly. */
const CURSOR = `
(() => {
  if (document.getElementById('reel-cursor')) return
  const c = document.createElement('div')
  c.id = 'reel-cursor'
  c.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(17,17,17,.88);border:3px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:2147483647;pointer-events:none;will-change:transform'
  document.body.appendChild(c)
  // Positions are in on-screen pixels (what getBoundingClientRect reports), but a
  // fixed element inside a zoomed page has its offsets multiplied by the zoom.
  const z = parseFloat(document.documentElement.style.zoom) || 1
  let x = innerWidth / 2, y = innerHeight * 0.6, s = 1
  const draw = () => { c.style.transform = 'translate(' + x / z + 'px,' + y / z + 'px) scale(' + s + ')' }
  draw()
  const ease = (k) => 1 - Math.pow(1 - k, 3)
  window.__moveCursor = (tx, ty, ms = 550) => {
    const fx = x, fy = y, t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms)
      x = fx + (tx - fx) * ease(k); y = fy + (ty - fy) * ease(k); draw()
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  window.__press = () => {
    const r = document.createElement('div')
    r.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:3px solid rgba(17,17,17,.45);z-index:2147483646;pointer-events:none'
    document.body.appendChild(r)
    const t0 = performance.now(), px = x, py = y
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 450)
      s = k < 0.25 ? 1 - k * 0.9 : 0.78 + (k - 0.25) * 0.29
      r.style.transform = 'translate(' + px / z + 'px,' + py / z + 'px) scale(' + (1 + k * 1.6) + ')'
      r.style.opacity = String(1 - k)
      draw()
      if (k < 1) requestAnimationFrame(step); else { s = 1; draw(); r.remove() }
    }
    requestAnimationFrame(step)
  }
})()`

async function run() {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      // Something speech-shaped for the microphone, so the memo has a real waveform.
      `--use-file-for-fake-audio-capture=${path.join(__dirname, 'voice.wav')}`,
      '--hide-scrollbars',
    ],
  })
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    permissions: ['microphone'],
  })
  await context.addInitScript(SLOW_CLOCK)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  // CSS animations and transitions slow down with the clock.
  await cdp.send('Animation.enable')
  const slowAnimations = () => cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW })
  await slowAnimations()

  let scene = null
  let n = 0
  cdp.on('Page.screencastFrame', async (f) => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    if (!scene) return
    const file = path.join(OUT, scene, String(n++).padStart(5, '0') + '.jpg')
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'))
    fs.appendFileSync(path.join(OUT, scene, 'times.txt'), `${path.basename(file)} ${f.metadata.timestamp}\n`)
  })

  const start = async (name) => {
    scene = name
    n = 0
    fs.mkdirSync(path.join(OUT, name), { recursive: true })
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
    await sleep(400)
  }
  const stop = async (hold = 600) => {
    await sleep(hold)
    // One last frame so the scene's final state is on file even if nothing repainted.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())))
    await cdp.send('Page.stopScreencast')
    fs.appendFileSync(path.join(OUT, scene, 'end.txt'), String(Date.now() / 1000))
    scene = null
  }

  const cursor = async () => page.evaluate(CURSOR)
  const moveTo = async (locator, settle = 650) => {
    await locator.scrollIntoViewIfNeeded()
    // Measured inside the page, so the cursor and its target share one coordinate system.
    await locator.evaluate((el) => {
      const r = el.getBoundingClientRect()
      window.__moveCursor(r.left + r.width / 2, r.top + r.height / 2)
    })
    await sleep(settle)
  }
  const click = async (locator, after = 700) => {
    await moveTo(locator)
    await page.evaluate(() => window.__press())
    await locator.click()
    await sleep(after)
  }
  const typeInto = async (locator, text, after = 550) => {
    await click(locator, 250)
    await page.keyboard.type(text, { delay: 75 * SLOW })
    await sleep(350)
    await page.keyboard.press('Enter')
    await sleep(after)
  }

  // ---------- A fresh visitor: no boards yet ----------
  await page.goto(APP + '/app/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.setItem('nook.splash.seen', '1')
  })
  await page.reload()
  await slowAnimations()
  await page.waitForSelector('text=Make your first board')
  // Bigger interface for the video: legible on a phone-sized YouTube player.
  await page.evaluate((ZOOM) => {
    document.documentElement.style.zoom = String(ZOOM)
    // Full-height layout is measured in unzoomed viewport units; scale it back so
    // the app still fits the window and only its own board area scrolls.
    const s = document.createElement('style')
    s.textContent = '.h-\\[100dvh\\] { height: calc(100dvh / ' + ZOOM + ') !important; }'
    document.head.appendChild(s)
  }, ZOOM)
  await sleep(1500) // let fonts settle and the splash go
  await cursor()

  // 1. Make a board
  await start('01-make-board')
  await sleep(900)
  await click(page.getByRole('button', { name: 'Weekly shop', exact: true }), 1400)
  await stop(400)

  // 2. Type items like a text
  const bar = page.getByLabel('Add an item: type it and press Enter')
  await start('02-type-items')
  await sleep(500)
  for (const item of ['6 eggs', 'oat milk 1l', '2 lemons', 'sourdough', 'coffee 250g']) {
    await typeInto(bar, item, 650)
  }
  await sleep(1800) // pictures fade in
  await stop(500)

  // 3. A note and a voice memo
  await start('03-note-voice')
  await sleep(400)
  await click(page.getByLabel('Add a note, voice memo or item'), 900)
  await click(page.getByRole('button', { name: /^Note/ }), 1100)
  const text = page.getByLabel('Note text')
  await click(text, 300)
  await page.keyboard.type('Get the ripe avocados, not the rock-hard ones!', { delay: 55 * SLOW })
  await sleep(500)
  await click(page.getByLabel('Lilac note'), 800)
  await click(page.getByRole('button', { name: 'Done' }), 1200)
  await click(page.getByLabel('Add a note, voice memo or item'), 900)
  await click(page.getByRole('button', { name: /^Voice/ }), 900)
  await click(page.getByRole('button', { name: 'Start' }), 3200)
  await click(page.getByRole('button', { name: /Stop/ }), 1600)
  await stop(600)

  // 4. Sort by aisle
  await start('04-aisle')
  await sleep(400)
  await click(page.getByRole('button', { name: /^View/ }), 900)
  await click(page.getByRole('button', { name: 'By aisle' }), 1600)
  await click(page.getByRole('button', { name: /^View/ }), 1600)
  await stop(600)

  // 5. Tick it all off
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0))
  await start('05-tick')
  await sleep(400)
  for (const t of ['Lemons', 'Sourdough', 'Eggs', 'Oat milk', 'Coffee']) {
    await click(page.getByLabel(`Mark ${t} as got`), 750)
  }
  await sleep(2400) // the big finish and the toast
  await stop(400)

  // 6. Sharing, from the website's demo board (it shows someone joining).
  // Full 1920x1080, with the page itself zoomed 1.6x so the demo fills the frame sharply.
  const zoomed = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  await zoomed.addInitScript(SLOW_CLOCK)
  const zp = await zoomed.newPage()
  const zcdp = await zoomed.newCDPSession(zp)
  await zcdp.send('Animation.enable')
  zcdp.on('Page.screencastFrame', async (f) => {
    zcdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    if (!scene) return
    const file = path.join(OUT, scene, String(n++).padStart(5, '0') + '.jpg')
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'))
    fs.appendFileSync(path.join(OUT, scene, 'times.txt'), `${path.basename(file)} ${f.metadata.timestamp}\n`)
  })
  const zstart = async (name) => {
    scene = name
    n = 0
    fs.mkdirSync(path.join(OUT, name), { recursive: true })
    await zcdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  }
  const zstop = async () => {
    await zcdp.send('Page.stopScreencast')
    scene = null
  }
  await zp.goto(APP + '/')
  await zp.waitForSelector('#how')
  await zcdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW })
  await zp.evaluate(() => (document.documentElement.style.zoom = '3.2'))
  await sleep(800)
  await zstart('06-share')
  await zp.evaluate(() => document.getElementById('how').scrollIntoView({ block: 'center' }))
  await sleep(16500) // one full loop: type, share, Mum joins, tick together
  await zstop()

  // 7. The website, for the outro
  await zp.evaluate(() => window.scrollTo(0, 0))
  await sleep(1200)
  await zstart('07-site')
  await sleep(3500)
  await zstop()

  await browser.close()
  console.log('scenes:', fs.readdirSync(OUT).map((d) => `${d} (${fs.readdirSync(path.join(OUT, d)).length - 2} frames)`).join(', '))
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
