import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { Member } from '../types'

const FRAME_H = 844
const FRAME_W = 390

/** Shrink the device to fit short windows so the whole screen stays visible. */
function useFitScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(
        Math.min(
          1,
          (window.innerHeight - 40) / FRAME_H,
          (window.innerWidth - 32) / FRAME_W,
        ),
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

/** `?frame` shows the app inside a drawn phone, for design shots. */
const useFramed = () =>
  useState(() => new URLSearchParams(window.location.search).has('frame'))[0]

export function Avatar({
  person,
  size = 20,
  ring = false,
}: {
  person?: Member
  size?: number
  ring?: boolean
}) {
  const initials = (person?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium text-white ${
        ring ? 'ring-2 ring-surface' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: person?.tint ?? '#C4C4CA',
        fontSize: Math.max(9, size * 0.4),
        letterSpacing: '0.02em',
      }}
      title={person?.name}
    >
      {initials}
    </span>
  )
}

function StatusBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-[54px] items-center justify-between px-8 pt-3 text-on-block">
      <span className="text-[15px] font-medium tracking-tight">9:41</span>
      <div className="absolute left-1/2 top-2.5 h-[30px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 20 12" className="h-[11px] w-[18px]" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
          <rect x="4.6" y="5" width="3" height="7" rx="1" />
          <rect x="9.2" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="13.8" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-[11px] w-[15px]" fill="currentColor">
          <path d="M8 10.8l2.1-2.3a3 3 0 00-4.2 0L8 10.8z" />
          <path
            d="M3.2 5.6a7 7 0 019.6 0"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M5.4 7.9a4 4 0 015.2 0"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex items-center gap-[3px]">
          <span className="text-[11px] font-medium">80</span>
          <svg viewBox="0 0 26 12" className="h-[12px] w-[25px]" fill="none">
            <rect
              x="0.6"
              y="0.6"
              width="21.5"
              height="10.8"
              rx="3.4"
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1.1"
            />
            <rect x="2.2" y="2.2" width="15" height="7.6" rx="2.2" fill="currentColor" />
            <path
              d="M23.6 4.2v3.6c1-.3 1.6-1 1.6-1.8s-.6-1.5-1.6-1.8z"
              fill="currentColor"
              fillOpacity="0.45"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

/**
 * The app fills the browser, on every screen size.
 *
 * The drawn phone — bezel, status bar, home indicator — is a presentation
 * device for design reviews and screenshots, not the product. It is behind
 * `?frame`, so the live site is a website and the mockup is still one URL away.
 */
export default function PhoneFrame({ children }: { children: ReactNode }) {
  const scale = useFitScale()
  const framed = useFramed()

  if (!framed) return <div className="h-[100dvh] w-full overflow-hidden bg-canvas">{children}</div>

  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-page">
      <div
        className="relative h-[844px] w-[390px] shrink-0 overflow-hidden rounded-[46px] bg-surface shadow-[0_40px_90px_-30px_rgba(17,17,19,0.35)] ring-1 ring-hairline/5"
        style={{ transform: `scale(${scale})` }}
      >
        <StatusBar />
        <div className="h-full" style={{ '--safe-top': '44px', '--safe-bottom': '18px' } as CSSProperties}>
          {children}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
          <div className="h-[5px] w-[134px] rounded-full bg-ink/40" />
        </div>
      </div>
    </div>
  )
}
