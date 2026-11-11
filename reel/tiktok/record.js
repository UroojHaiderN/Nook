// Nook TikTok: a vertical 1080x1920 reel, recorded at 2x (2160x3840) for crisp text.
// The stage page holds a phone frame with the real app inside, plus sticker
// captions and full-screen hook/outro cards. Same slowed-clock trick as the
// YouTube reel: the page runs SLOW times slower, build.py speeds it back up.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'frames')
const STAGE = 'http://localhost:5174/reel/tiktok/stage.html'
const APP = 'http://localhost:5174/app/'
const W = 2160
const H = 3840
const SLOW = 3
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SLOW))

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

/* A fingertip: where the tap lands, with a ripple. Runs inside the app frame. */
const FINGER = `(() => {
  if (document.getElementById('reel-finger')) return
  const c = document.createElement('div')
  c.id = 'reel-finger'
  c.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(17,17,17,.55);box-shadow:0 6px 16px rgba(0,0,0,.25);z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .2s'
  document.body.appendChild(c)
  let x = innerWidth / 2, y = innerHeight * 0.7, s = 1
  const draw = () => { c.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')' }
  draw()
  const ease = (k) => 1 - Math.pow(1 - k, 3)
  window.__show = (on) => { c.style.opacity = on ? '1' : '0' }
  window.__move = (tx, ty, ms = 380) => {
    const fx = x, fy = y, t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms)
      x = fx + (tx - fx) * ease(k); y = fy + (ty - fy) * ease(k); draw()
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  window.__tap = () => {
    const r = document.createElement('div')
    r.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(17,17,17,.4);z-index:2147483646;pointer-events:none'
    document.body.appendChild(r)
    const t0 = performance.now(), px = x, py = y
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 380)
      s = k < 0.3 ? 1 - k : 0.7 + (k - 0.3) * 0.43
      r.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + (1 + k * 1.4) + ')'
      r.style.opacity = String(1 - k)
      draw()
      if (k < 1) requestAnimationFrame(step); else { s = 1; draw(); r.remove() }
    }
    requestAnimationFrame(step)
  }
})()`

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] })
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  await context.addInitScript(SLOW_CLOCK)
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)

  // Set up off camera: a fresh visitor with one board, "Weekly shop".
  await page.goto(STAGE)
  await page.evaluate(() => (document.documentElement.style.zoom = '2'))
  await page.evaluate((src) => (document.getElementById('app').src = src), APP)
  let app
  for (let i = 0; i < 50 && !app; i++) {
    app = page.frames().find((f) => f.url().startsWith('http://localhost:5174/app/'))
    if (!app) await new Promise((r) => setTimeout(r, 100))
  }
  await app.waitForLoadState()
  await app.evaluate(() => {
    localStorage.clear()
    sessionStorage.setItem('nook.splash.seen', '1')
  })
  await page.evaluate((src) => (document.getElementById('app').src = src + '?' + Date.now()), APP)
  await new Promise((r) => setTimeout(r, 1500))
  app = page.frames().find((f) => f.url().startsWith('http://localhost:5174/app/'))
  await app.getByRole('button', { name: 'Weekly shop', exact: true }).waitFor()
  await app.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Weekly shop').click())
  await app.getByLabel('Add an item: type it and press Enter').waitFor()
  await new Promise((r) => setTimeout(r, 1200))
  await app.evaluate(FINGER)

  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW })

  // Helpers
  const stage = (fn, ...args) => page.evaluate(fn, ...args)
  const point = async (locator) => {
    await locator.evaluate((el) => {
      el.scrollIntoView({ block: 'nearest' })
      const r = el.getBoundingClientRect()
      window.__move(r.left + r.width / 2, r.top + r.height / 2)
    })
    await sleep(420)
  }
  const tap = async (locator, after = 350) => {
    await point(locator)
    await app.evaluate(() => window.__tap())
    await locator.evaluate((el) => el.click())
    await sleep(after)
  }
  const type = async (text) => {
    const bar = app.getByLabel('Add an item: type it and press Enter')
    await tap(bar, 120)
    await bar.focus()
    await page.keyboard.type(text, { delay: 42 * SLOW })
    await sleep(160)
    await page.keyboard.press('Enter')
    await sleep(380)
  }

  // Record
  let n = 0
  cdp.on('Page.screencastFrame', (f) => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    const file = path.join(OUT, String(n++).padStart(5, '0') + '.jpg')
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'))
    fs.appendFileSync(path.join(OUT, 'times.txt'), `${path.basename(file)} ${f.metadata.timestamp}\n`)
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  await sleep(150)

  // 1. Hook
  await stage(() => card(`${buddiesHtml(150, '#DBB8F2')}<h1>${words('POV: you’re the only one who ever remembers the shopping')}</h1>`, '#DBB8F2'))
  await sleep(2500)
  await stage(() => card(`<h1>${words('so I made a list the whole house can see 👀')}</h1>`, '#E2F16B'))
  await sleep(1800)
  await stage(() => card(null))
  await stage(() => bgColor('#E2F16B'))
  await sleep(300)

  // 2. Typing
  await stage(() => caption('just type it like a text ✍️', 'ink', -2))
  await app.evaluate(() => window.__show(true))
  for (const item of ['6 eggs', 'oat milk', '2 lemons', 'bananas']) await type(item)
  await stage(() => caption('it finds the pics 🍋', 'white', 2))
  await sleep(1300)

  // 3. By aisle
  await stage(() => caption('…and sorts it by aisle 🛒', 'cobalt', -3))
  await tap(app.getByRole('button', { name: /^View options/ }), 450)
  await tap(app.getByRole('button', { name: 'By aisle' }), 700)
  await tap(app.getByRole('button', { name: /^View options/ }), 900)

  // 4. Share
  await stage(() => bgColor('#DBB8F2'))
  await stage(() => caption('send the house the link 🔗', 'lime', 2))
  // Point and tap at Share, but show the share sheet on the stage: this local
  // copy runs without accounts, and its real sheet says so.
  await point(app.getByRole('button', { name: /^Share/ }))
  await app.evaluate(() => window.__tap())
  await sleep(120)
  await stage(() => share('open'))
  await sleep(900)
  await stage(() => share('copied'))
  await sleep(900)
  await stage(() => share('off'))
  await sleep(350)
  await stage(() => toast('Mum joined the board 💜'))
  await sleep(1400)
  await stage(() => toast(null))

  // 5. Tick it off
  await stage(() => bgColor('#E2F16B'))
  await stage(() => caption('tick it off together ✅', 'ink', -2))
  for (const t of ['Lemons', 'Bananas', 'Eggs', 'Oat milk']) {
    await tap(app.getByLabel(`Mark ${t} as got`), 420)
  }
  await stage(() => caption('clear the list = tiny party 🎉', 'lilac', 3))
  await sleep(1700)

  // 6. Outro
  await app.evaluate(() => window.__show(false))
  await stage(() => card(`${buddiesHtml(130, '#FFFFFF')}<h1>${words('Nook')}</h1><p>the shopping list the whole house can see</p><div class="pill">free · link in bio</div>`, '#FFFFFF'))
  await sleep(2800)

  await cdp.send('Page.stopScreencast')
  await browser.close()
  console.log('frames:', n)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
