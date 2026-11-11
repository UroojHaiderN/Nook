import { useEffect, useRef, useState, type ReactNode } from 'react'
import ProductArt from '../components/ProductArt'
import ConfettiLayer, { celebrateFrom } from '../components/Confetti'
import { Link, Plus } from '../components/Icons'
import { parseItemInput } from '../parse'
import { Buddy } from './Buddies'

/* ------------------------------------------------------------------ */
/* Where the buttons go                                                */
/* ------------------------------------------------------------------ */

/** Someone who already has an account goes straight to their boards. */
const signedIn = (() => {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k))
  } catch {
    return false
  }
})()

const START = signedIn ? '/app/' : '/signup'
const START_LABEL = signedIn ? 'Open your boards' : 'Start a board — free'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        el.classList.add('in')
        io.disconnect()
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2" aria-label="Nook home">
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        <span className="h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-lime" />
        <span className="h-[11px] w-[11px] bg-tomato" />
        <span className="h-[13px] w-[13px] rounded-full bg-cobalt" />
      </span>
      <span className="font-display text-[25px] leading-none tracking-[-0.03em] text-ink">Nook</span>
    </a>
  )
}

function Cta({ className = '' }: { className?: string }) {
  return (
    <a
      href={START}
      className={`tap inline-flex h-[58px] items-center justify-center rounded-full bg-ink px-8 text-[17px] text-on-ink transition-transform hover:-translate-y-0.5 ${className}`}
    >
      {START_LABEL}
    </a>
  )
}

/* ------------------------------------------------------------------ */
/* The demo: the app, playing itself                                   */
/* ------------------------------------------------------------------ */

type DemoItem = { id: string; title: string; size: string; qty: number; done: boolean; by?: string }

const STEPS = [
  { title: 'Type it like you’d text it', body: '“6 eggs”, “oat milk 1l” — Nook finds the picture and the aisle.' },
  { title: 'Share the board with a link', body: 'Whoever opens it is on the board, and it stays in sync.' },
  { title: 'Tick it off together', body: 'Everyone sees it go. Clear the list and you get a little party.' },
]

const item = (raw: string, id: string): DemoItem => {
  const p = parseItemInput(raw)
  return { id, title: p.title, size: p.amount, qty: p.qty, done: false }
}

const START_ITEMS = () => [item('3 lemons', 'lemons'), item('sourdough', 'bread')]

/** What reduced motion sees: the board half done, standing still. */
const SETTLED = () =>
  [item('6 eggs', 'eggs'), item('oat milk 1l', 'milk'), ...START_ITEMS()].map((i, n) => ({ ...i, done: n % 2 === 0 }))

/**
 * A scripted run through the three things Nook is for, looping while it's on
 * screen. It pauses when scrolled away, so the confetti never goes off unseen,
 * and with reduced motion it simply shows the finished board.
 */
function Demo() {
  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState('')
  const [items, setItems] = useState<DemoItem[]>(() => (reducedMotion() ? SETTLED() : START_ITEMS()))
  const [sharing, setSharing] = useState<'off' | 'open' | 'copied'>('off')
  const [joined, setJoined] = useState(reducedMotion)
  const [toast, setToast] = useState<string | null>(null)
  const [tap, setTap] = useState<string | null>(null)
  const [run, setRun] = useState(0)
  const frame = useRef<HTMLDivElement>(null)
  const rings = useRef<Record<string, HTMLElement | null>>({})

  // Play only while the demo is on screen.
  const [onScreen, setOnScreen] = useState(false)
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion() || !onScreen) return

    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))
    const typeOut = (start: number, text: string) => {
      ;[...text].forEach((_, i) => at(start + i * 85, () => setTyped(text.slice(0, i + 1))))
      return start + text.length * 85
    }
    const add = (raw: string, id: string) => {
      setTyped('')
      setItems((list) => [item(raw, id), ...list])
    }
    const tick = (id: string, by?: string) => {
      setTap(id)
      setItems((list) => list.map((i) => (i.id === id ? { ...i, done: true, by } : i)))
      celebrateFrom(rings.current[id] ?? null)
      timers.push(window.setTimeout(() => setTap(null), 450))
    }

    // Start over
    at(0, () => {
      setStep(0)
      setTyped('')
      setItems(START_ITEMS())
      setSharing('off')
      setJoined(false)
      setToast(null)
    })

    // 1 — adding
    let t = typeOut(700, '6 eggs')
    at(t + 350, () => add('6 eggs', 'eggs'))
    t = typeOut(t + 1100, 'oat milk 1l')
    at(t + 350, () => add('oat milk 1l', 'milk'))
    // 2 — sharing
    t += 1500
    at(t, () => setStep(1))
    at(t + 300, () => setSharing('open'))
    at(t + 1200, () => setSharing('copied'))
    at(t + 2200, () => setSharing('off'))
    at(t + 2600, () => {
      setJoined(true)
      setToast('Mum joined the board')
    })
    at(t + 4300, () => setToast(null))
    // 3 — ticking
    t += 4800
    at(t, () => setStep(2))
    at(t + 500, () => tick('eggs'))
    at(t + 1500, () => tick('milk', 'M'))
    at(t + 2400, () => tick('lemons', 'M'))
    at(t + 3300, () => {
      tick('bread')
      setToast('All got. Nice shop!')
    })
    at(t + 6200, () => setRun((r) => r + 1))

    return () => timers.forEach(clearTimeout)
  }, [onScreen, run])

  const shown = items.slice(0, 4)

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
      <div className="order-2 lg:order-1">
        <p className="mb-4 px-5 text-[13px] uppercase tracking-[0.14em] text-muted">How it works</p>
        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className={`rounded-[24px] px-5 py-4 transition-colors duration-300 ${step === i ? 'bg-panel' : ''}`}
              aria-current={step === i ? 'step' : undefined}
            >
              <span className="flex items-baseline gap-3">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] transition-colors ${
                    step === i ? 'bg-ink text-on-ink' : 'bg-panel text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span>
                  <span
                    className={`font-display block text-[21px] leading-tight tracking-[-0.02em] transition-colors ${
                      step === i ? 'text-ink' : 'text-ink/50'
                    }`}
                  >
                    {s.title}
                  </span>
                  <span
                    className={`block overflow-hidden text-[15px] leading-snug text-muted transition-all duration-300 ${
                      step === i ? 'mt-1 max-h-16 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {s.body}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div ref={frame} className="relative order-1 mx-auto w-full max-w-[440px] lg:order-2">
        <Buddy kind="circle" size={64} className="absolute -right-1 -top-14 z-10 sm:-right-8" delay={0.3} />
        <Buddy kind="flower" size={58} className="absolute -bottom-8 -left-3 z-10" delay={1} mood="wow" />

        <div
          className="relative overflow-hidden rounded-[34px] bg-[#F1EADC] p-3 sm:p-4"
          role="img"
          aria-label="Nook in action: adding eggs and oat milk, sharing the board, and ticking everything off"
        >
          {/* Header card: the board and how much is left, as in the app */}
          <div className="flex items-center gap-3 rounded-[22px] bg-surface p-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#FBBF24]">
              <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
                <path d="M20 9l12 21H8L20 9z" fill="#fff" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink">Saturday shop</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {shown.filter((i) => !i.done).length ? `${shown.filter((i) => !i.done).length} to get` : 'All got'} · Updated just now
              </p>
            </div>
            <div className="flex -space-x-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[11px] text-on-ink ring-2 ring-surface">
                Y
              </span>
              <span
                className={`grid h-7 w-7 place-items-center rounded-full bg-lilac text-[11px] text-ink ring-2 ring-surface transition-all duration-500 ${
                  joined ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              >
                M
              </span>
            </div>
          </div>

          {/* The list: one row per thing, a box to tick */}
          <p className="px-3 pb-1.5 pt-4 text-[12px] font-medium text-muted">List</p>
          <div className="min-h-[232px] overflow-hidden rounded-[22px] bg-surface py-0.5">
            {shown.map((it) => (
              <div key={it.id} className="drop-in group/row flex items-center gap-3 pl-3.5">
                <span
                  ref={(el) => {
                    rings.current[it.id] = el
                  }}
                  className={`relative grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] transition-all duration-200 ${
                    it.done ? 'bg-cobalt text-white' : 'border-[1.75px] border-hairline/25 text-transparent'
                  } ${tap === it.id ? 'scale-90' : ''}`}
                >
                  <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" aria-hidden="true">
                    <path d="M5.5 12.5l4.2 4.2L18.5 7.8" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {it.by && (
                    <span className="absolute -right-2.5 -top-2.5 grid h-[17px] w-[17px] place-items-center rounded-full bg-lilac text-[9px] text-ink ring-2 ring-surface">
                      {it.by}
                    </span>
                  )}
                </span>
                <span className="flex min-h-[57px] min-w-0 flex-1 items-center gap-2.5 border-t border-hairline/[0.07] pr-3.5 group-first/row:border-t-0">
                  <span
                    className={`min-w-0 flex-1 truncate text-[16px] ${it.done ? 'text-muted/80 line-through' : 'text-ink'}`}
                  >
                    {it.title}
                  </span>
                  <span className="font-mono text-[12px] text-muted">
                    {it.size}
                    {it.qty > 1 && <span className={it.size ? 'ml-1.5 text-ink/70' : 'text-ink/70'}>×{it.qty}</span>}
                  </span>
                  <ProductArt
                    art={parseItemInput(it.title).art}
                    title={it.title}
                    className={`pointer-events-none h-[30px] w-[30px] shrink-0 transition-opacity duration-300 ${
                      it.done ? 'opacity-35 grayscale' : ''
                    }`}
                  />
                </span>
              </div>
            ))}
          </div>

          {/* Add bar */}
          <div className="mt-3 flex h-[52px] items-center gap-2 rounded-full bg-surface p-1.5 pl-4 shadow-[0_1px_2px_rgba(28,28,30,0.06),0_14px_30px_-14px_rgba(28,28,30,0.25)]">
            <span className="min-w-0 flex-1 truncate text-[15px] text-ink">
              {typed ? (
                <>
                  {typed}
                  <span className="ml-0.5 inline-block h-[17px] w-[2px] translate-y-[3px] animate-pulse bg-cobalt" />
                </>
              ) : (
                <span className="text-muted/80">Add an item…</span>
              )}
            </span>
            <span
              className={`grid h-10 w-10 place-items-center rounded-[14px] bg-ink text-on-ink transition-transform ${
                typed ? 'scale-105' : ''
              }`}
            >
              <Plus className="h-[19px] w-[19px]" strokeWidth={2.4} />
            </span>
          </div>

          {/* Share sheet, sliding up over the board */}
          <div
            className={`absolute inset-x-3 bottom-3 rounded-[26px] bg-surface p-5 shadow-[0_20px_50px_-20px_rgba(17,17,17,0.45)] transition-all duration-500 ${
              sharing === 'off' ? 'pointer-events-none translate-y-[110%] opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <p className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Share this board</p>
            <p className="mt-1 text-[13px] text-muted">Send the link to anyone. They sign up and they’re on it.</p>
            <div className="mt-4 flex h-[48px] items-center gap-2 rounded-[14px] bg-panel p-1.5 pl-4">
              <Link className="h-[16px] w-[16px] shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">nook…/join/saturday-shop-k7p2</span>
              <span
                className={`rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors ${
                  sharing === 'copied' ? 'bg-[#34C759] text-white' : 'bg-ink text-on-ink'
                }`}
              >
                {sharing === 'copied' ? 'Copied' : 'Copy link'}
              </span>
            </div>
          </div>

          {/* Toast */}
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-[78px] flex justify-center transition-all duration-300 ${
              toast ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <span className="rounded-full bg-ink px-4 py-2.5 text-[13px] text-on-ink">{toast ?? ' '}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#faq" className="hidden rounded-full px-3 py-2 text-[15px] text-ink/75 hover:text-ink sm:inline">
            Questions
          </a>
          {!signedIn && (
            <a href="/login" className="rounded-full px-3 py-2 text-[15px] text-ink">
              Sign in
            </a>
          )}
          <a
            href={START}
            className="tap ml-1 inline-flex h-10 items-center rounded-full bg-ink px-4 text-[15px] text-on-ink sm:px-5"
          >
            {signedIn ? 'Open Nook' : 'Try it free'}
          </a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center sm:px-8 sm:pb-24 sm:pt-20">
      <div className="mb-7 flex items-end justify-center gap-2.5">
        <Buddy kind="tri" size={46} />
        <Buddy kind="square" size={40} delay={0.4} mood="wink" />
        <Buddy kind="circle" size={46} delay={0.8} />
        <Buddy kind="flower" size={46} delay={1.2} />
      </div>
      <h1 className="mx-auto max-w-4xl text-[46px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[80px]">
        The shopping list the whole house can see.
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-[18px] leading-[1.5] text-muted sm:text-[20px]">
        One board for the shop — lists, notes and voice memos — shared with a link. No more “did
        anyone get milk?”
      </p>
      <div className="mt-9 flex flex-col items-center gap-3">
        <Cta />
        <p className="text-[14px] text-muted">Free · Works in any browser · Nothing to install</p>
      </div>
    </section>
  )
}

function Promises() {
  const rows = [
    { kind: 'tri' as const, title: 'Lives on your home screen', body: 'Add it from the browser and it opens like an app.' },
    { kind: 'circle' as const, title: 'Fine with bad signal', body: 'Keep ticking in the basement aisle. It syncs when you’re back.' },
    { kind: 'flower' as const, title: 'Free, properly', body: 'Every board and every feature. No card, no trial.' },
  ]
  return (
    <section className="bg-panel">
      <Reveal className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-8 sm:py-16">
        {rows.map((r, i) => (
          <div key={r.title} className="flex gap-4">
            <Buddy kind={r.kind} size={44} delay={i * 0.4} className="shrink-0" />
            <div>
              <p className="font-display text-[20px] leading-tight tracking-[-0.02em] text-ink">{r.title}</p>
              <p className="mt-1 text-[15px] leading-[1.5] text-muted">{r.body}</p>
            </div>
          </div>
        ))}
      </Reveal>
    </section>
  )
}

const FAQS: { q: string; a: string }[] = [
  { q: 'Is Nook free?', a: 'Yes — every board and every feature, with no card and no trial.' },
  {
    q: 'Do the people I share with need an account?',
    a: 'Yes, a free one. It’s how a board stays private to the people you invited. It takes about twenty seconds.',
  },
  {
    q: 'Is there an app to download?',
    a: 'Not yet — Nook runs in your browser. On iPhone, tap Share → Add to Home Screen in Safari; on Android, choose Install app from the menu.',
  },
  {
    q: 'Who can see my boards?',
    a: 'Only you and the people you’ve shared a board’s link with. Take someone off, or make a new link, whenever you like.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Any time, from the account menu in the app. Your boards and voice memos go with it.',
  },
]

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-8 sm:py-28">
      <Reveal>
        <h2 className="text-center text-[40px] leading-[1] tracking-[-0.03em] text-ink sm:text-[52px]">Questions</h2>
        <div className="mt-10 divide-y divide-hairline/[0.1] border-y border-hairline/[0.1]">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-panel transition-transform group-open:rotate-45">
                  <Plus className="h-[16px] w-[16px]" strokeWidth={2} />
                </span>
              </summary>
              <p className="mt-3 pr-10 text-[16px] leading-[1.6] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="overflow-hidden bg-lime">
      <Reveal className="mx-auto max-w-6xl px-4 pt-20 text-center sm:px-8 sm:pt-28">
        <h2 className="mx-auto max-w-3xl text-[44px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[72px]">
          Never buy a third jar of paprika again.
        </h2>
        <div className="mt-9">
          <Cta />
        </div>
        <div className="mt-14 flex translate-y-3 items-end justify-center gap-3 sm:gap-6">
          <Buddy kind="tri" size={92} color="#FFFFFF" />
          <Buddy kind="square" size={80} delay={0.35} mood="wink" />
          <Buddy kind="circle" size={100} delay={0.7} mood="wow" />
          <Buddy kind="flower" size={92} delay={1.05} />
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 pb-28 sm:flex-row sm:items-center sm:px-8 sm:pb-8">
        <Logo />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-muted">
          <a href="/app/" className="hover:text-ink">
            Open Nook
          </a>
          <a href="/privacy/" className="hover:text-ink">
            Privacy
          </a>
          <span>© {new Date().getFullYear()} Nook</span>
        </nav>
      </div>
    </footer>
  )
}

/** On a phone, once the hero is out of view, the way in stays in reach. */
function StickyBar() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const on = () => setShown(window.scrollY > 560)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <div
      className={`fixed inset-x-3 bottom-[calc(var(--safe-bottom)+12px)] z-40 transition-all duration-300 sm:hidden ${
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 rounded-full bg-surface p-2 pl-3 shadow-[0_16px_40px_-14px_rgba(17,17,17,0.35)] ring-1 ring-hairline/[0.08]">
        <Buddy kind="circle" size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display text-[16px] text-ink">Nook</p>
          <p className="truncate text-[12px] text-muted">Lists for the whole house</p>
        </div>
        <a href={START} className="tap rounded-full bg-ink px-5 py-3 text-[15px] text-on-ink">
          {signedIn ? 'Open' : 'Try free'}
        </a>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <Nav />
      <main>
        <Hero />
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-8 sm:pb-32">
          <Demo />
        </section>
        <Promises />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyBar />
      <ConfettiLayer />
    </div>
  )
}
