// Renders the title cards as 1920x1080 PNGs, in Nook's own fonts and colours.
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const NM = '/Users/lnu.ur/nook/node_modules/@fontsource-variable'
const BRICO = `file://${NM}/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2`
const DMSANS = `file://${NM}/dm-sans/files/dm-sans-latin-opsz-normal.woff2`
const OUT = path.join(__dirname, 'titles')

const face = (ink) => `
  <g fill="${ink}" stroke="${ink}">
    <ellipse cx="-11" cy="-6" rx="4.2" ry="5.4" stroke="none"/>
    <ellipse cx="11" cy="-6" rx="4.2" ry="5.4" stroke="none"/>
    <path d="M-8 6 q8 8 16 0" fill="none" stroke-width="3.2" stroke-linecap="round"/>
  </g>`
const buddies = (size = 120, triFill = '#E2F16B') => `
  <div class="buddies">
    <svg viewBox="0 0 100 100" width="${size}" height="${size}"><path d="M50 6 L96 90 Q97 94 92 94 L8 94 Q3 94 4 90 Z" fill="${triFill}"/><g transform="translate(50 66)">${face('#111')}</g></svg>
    <svg viewBox="0 0 100 100" width="${size * 0.88}" height="${size * 0.88}"><rect x="8" y="8" width="84" height="84" rx="10" fill="#F0582F"/><g transform="translate(50 50)">${face('#111')}</g></svg>
    <svg viewBox="0 0 100 100" width="${size}" height="${size}"><circle cx="50" cy="50" r="44" fill="#4450D6"/><g transform="translate(50 50)">${face('#fff')}</g></svg>
    <svg viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="#DBB8F2"><circle cx="50" cy="26" r="24"/><circle cx="74" cy="50" r="24"/><circle cx="50" cy="74" r="24"/><circle cx="26" cy="50" r="24"/><circle cx="50" cy="50" r="22"/></g><g transform="translate(50 52)">${face('#111')}</g></svg>
  </div>`

const CARDS = [
  { id: 't0-intro', bg: '#FFFFFF', ink: '#111', html: `${buddies(130)}<h1 class="brand">Nook</h1><p class="sub">The shopping list the whole house can see.</p>` },
  { id: 't1', bg: '#E2F16B', ink: '#111', step: '01', title: 'Make a board', sub: 'One for each shop, trip or plan.' },
  { id: 't2', bg: '#DBB8F2', ink: '#111', step: '02', title: 'Type it like you’d text it', sub: '“6 eggs”, “oat milk 1l” — it finds the picture and the aisle.' },
  { id: 't3', bg: '#4450D6', ink: '#FFF', step: '03', title: 'Notes and voice memos', sub: 'For the things a list can’t say.' },
  { id: 't4', bg: '#F0582F', ink: '#111', step: '04', title: 'Sorted by aisle', sub: 'The list lines up the way you walk the shop.' },
  { id: 't5', bg: '#E2F16B', ink: '#111', step: '05', title: 'Tick it off', sub: 'Clear the list and you get a little party.' },
  { id: 't6', bg: '#DBB8F2', ink: '#111', step: '06', title: 'Share it with a link', sub: 'Whoever opens it is on the board — synced while you shop.' },
  { id: 't7-outro', bg: '#FFFFFF', ink: '#111', html: `${buddies(120)}<h1 class="cta">Start a board — free</h1><p class="url">nook-navy-mu.vercel.app</p>` },
]

const page = (c) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Brico; src: url(${BRICO}) format('woff2'); font-weight: 200 800; }
  @font-face { font-family: DMS; src: url(${DMSANS}) format('woff2'); font-weight: 100 1000; }
  html, body { margin: 0; width: 1920px; height: 1080px; }
  body { background: ${c.bg}; color: ${c.ink}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: DMS, sans-serif; }
  .step { font: 600 30px DMS; letter-spacing: .18em; opacity: .55; margin-bottom: 28px; }
  h1 { font-family: Brico; font-weight: 800; letter-spacing: -0.035em; margin: 0; line-height: .98; }
  .title { font-size: 150px; max-width: 1500px; }
  .brand { font-size: 260px; margin-top: 40px; }
  .cta { font-size: 130px; margin-top: 46px; }
  .sub { font-size: 46px; margin: 36px 0 0; opacity: .72; max-width: 1300px; line-height: 1.3; }
  .url { font: 500 46px DMS; margin: 38px 0 0; padding: 18px 40px; border-radius: 999px; background: #111; color: #fff; }
  .buddies { display: flex; align-items: flex-end; gap: 26px; }
</style></head><body>${
  c.html ??
  `<div class="step">${c.step}</div><h1 class="title">${c.title}</h1><p class="sub">${c.sub}</p>`
}</body></html>`

;(async () => {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT)
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] })
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  for (const c of CARDS) {
    const file = path.join(OUT, `${c.id}.html`)
    fs.writeFileSync(file, page(c))
    await p.goto('file://' + file)
    await p.evaluate(() => document.fonts.ready)
    const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))
    if (!fonts.includes('Brico')) throw new Error('title font did not load for ' + c.id)
    await p.screenshot({ path: path.join(OUT, `${c.id}.png`) })
  }
  await browser.close()
  console.log('titles:', CARDS.map((c) => c.id).join(', '))
})()
