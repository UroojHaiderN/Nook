// Records Nook's demo scenes as high-quality frame sequences (CDP screencast),
// one folder per scene, each frame stamped with its capture time.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, 'scenes')
const APP = 'http://localhost:5174'
const W = 1920
const H = 1080
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* A visible cursor, since a headless browser has none. */
const CURSOR = `
(() => {
  if (document.getElementById('reel-cursor')) return
  const c = document.createElement('div')
  c.id = 'reel-cursor'
  c.style.cssText = 'position:fixed;left:960px;top:620px;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;background:rgba(17,17,17,.88);border:3px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.25);z-index:2147483647;pointer-events:none;transition:left .55s cubic-bezier(.3,.7,.2,1),top .55s cubic-bezier(.3,.7,.2,1),transform .12s'
  document.body.appendChild(c)
  window.__moveCursor = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px' }
  window.__press = () => {
    c.style.transform = 'scale(.78)'
    const r = document.createElement('div')
    r.style.cssText = 'position:fixed;left:' + c.style.left + ';top:' + c.style.top + ';width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:3px solid rgba(17,17,17,.45);z-index:2147483646;pointer-events:none;transition:transform .45s ease-out,opacity .45s ease-out'
    document.body.appendChild(r)
    requestAnimationFrame(() => { r.style.transform = 'scale(2.6)'; r.style.opacity = '0' })
    setTimeout(() => { c.style.transform = ''; r.remove() }, 480)
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
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)

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
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
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
    const box = await locator.boundingBox()
    if (!box) throw new Error('nothing to point at: ' + locator)
    await page.evaluate(([x, y]) => window.__moveCursor(x, y), [box.x + box.width / 2, box.y + box.height / 2])
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
    await page.keyboard.type(text, { delay: 75 })
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
  await page.waitForSelector('text=Make your first board')
  // Bigger interface for the video: legible on a phone-sized YouTube player.
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1.35'
    // Full-height layout is measured in unzoomed viewport units; scale it back so
    // the app still fits the window and only its own board area scrolls.
    const s = document.createElement('style')
    s.textContent = '.h-\\[100dvh\\] { height: calc(100dvh / 1.35) !important; }'
    document.head.appendChild(s)
  })
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
  await page.keyboard.type('Get the ripe avocados, not the rock-hard ones!', { delay: 55 })
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
  const zp = await zoomed.newPage()
  const zcdp = await zoomed.newCDPSession(zp)
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
    await zcdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  }
  const zstop = async () => {
    await zcdp.send('Page.stopScreencast')
    scene = null
  }
  await zp.goto(APP + '/')
  await zp.waitForSelector('#how')
  await zp.evaluate(() => (document.documentElement.style.zoom = '1.6'))
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
