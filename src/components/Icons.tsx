type P = { className?: string; strokeWidth?: number }

const base = (className = '') => `shrink-0 ${className}`

export const Back = ({ className, strokeWidth = 1.7 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path
      d="M15 5l-7 7 7 7"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const Tune = ({ className, strokeWidth = 1.7 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M3 8h12M18.5 8H21M3 16h4M10.5 16H21" />
      <circle cx="16.5" cy="8" r="2" />
      <circle cx="8.5" cy="16" r="2" />
    </g>
  </svg>
)

export const Search = ({ className, strokeWidth = 1.8 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5L20 20" />
    </g>
  </svg>
)

export const Sort = ({ className, strokeWidth = 1.8 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4v16M8 4L4.5 7.5M8 4l3.5 3.5" />
      <path d="M16 20V4M16 20l3.5-3.5M16 20l-3.5-3.5" />
    </g>
  </svg>
)

export const Plus = ({ className, strokeWidth = 1.8 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path
      d="M12 6v12M6 12h12"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
)

export const PlusBox = ({ className, strokeWidth = 1.5 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </g>
  </svg>
)

export const Check = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.9" />
    </g>
  </svg>
)

/** A bare tick, for inside a filled box. */
export const Tick = ({ className, strokeWidth = 2.4 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path d="M5.5 12.5l4.2 4.2L18.5 7.8" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Phone = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path
      d="M6.2 4.5h2.3l1.3 3.2-1.7 1.3a10.5 10.5 0 004.9 4.9l1.3-1.7 3.2 1.3v2.3c0 1-.8 1.8-1.8 1.7C9.6 17.1 6.9 14.4 4.5 6.3c-.1-1 .7-1.8 1.7-1.8z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
)

export const Play = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path d="M9.5 7.8l7 4.2-7 4.2V7.8z" fill="currentColor" />
  </svg>
)

export const Pause = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g fill="currentColor">
      <rect x="8.5" y="7.5" width="2.6" height="9" rx="1.1" />
      <rect x="13" y="7.5" width="2.6" height="9" rx="1.1" />
    </g>
  </svg>
)

export const Link = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <path d="M10.2 13.8a3.6 3.6 0 010-5l2.6-2.6a3.6 3.6 0 115 5l-1.2 1.2" />
      <path d="M13.8 10.2a3.6 3.6 0 010 5l-2.6 2.6a3.6 3.6 0 11-5-5l1.2-1.2" />
    </g>
  </svg>
)

export const Share = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15.5V4.5M12 4.5L8.6 7.9M12 4.5l3.4 3.4" />
      <path d="M5.5 13v5a2 2 0 002 2h9a2 2 0 002-2v-5" />
    </g>
  </svg>
)

export const Pen = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <path
      d="M4.5 19.5c3-1 4.5-2.5 6.5-6.5s4-7 6.5-8c1.5 2.5.5 5.5-1.5 8.5s-5 5.5-8 6c-1.6.3-2.6.3-3.5 0z"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
)

export const Saved = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.6 12.2l2.4 2.4 4.4-4.8" />
    </g>
  </svg>
)

export const TextBox = ({ className, strokeWidth = 1.5 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M9 9.5h6M9 13h4" />
    </g>
  </svg>
)

export const Mic = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      <rect x="9.5" y="3.5" width="5" height="10" rx="2.5" />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v2.5" />
    </g>
  </svg>
)

export const Basket = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16l-1.4 8.2a2 2 0 01-2 1.8H7.4a2 2 0 01-2-1.8L4 9z" />
      <path d="M8.5 9l2-4.5M15.5 9l-2-4.5" />
    </g>
  </svg>
)

export const Trash = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14M10 7V5.5A1.5 1.5 0 0111.5 4h1A1.5 1.5 0 0114 5.5V7" />
      <path d="M6.5 7l.8 11a2 2 0 002 1.9h5.4a2 2 0 002-1.9l.8-11" />
    </g>
  </svg>
)

export const People = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="8.5" r="3.4" />
      <path d="M3.8 19.2a5.9 5.9 0 0111.4 0" />
      <path d="M16.2 5.6a3.2 3.2 0 010 6.1M17.5 14.2a5.6 5.6 0 013.1 4.6" />
    </g>
  </svg>
)

export const PersonPlus = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="8.5" r="3.4" />
      <path d="M4.3 19.2a5.9 5.9 0 0111.4 0" />
      <path d="M18.5 6.5v5M16 9h5" />
    </g>
  </svg>
)

export const Mail = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="M4.5 8l6.3 4.4a2 2 0 002.4 0L19.5 8" />
    </g>
  </svg>
)

export const Eye = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  </svg>
)

export const EyeOff = ({ className, strokeWidth = 1.6 }: P) => (
  <svg viewBox="0 0 24 24" fill="none" className={base(className)}>
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.3 7.3C3.9 9 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17" />
    </g>
  </svg>
)

export const More = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)}>
    <circle cx="5.5" cy="12" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="18.5" cy="12" r="1.7" />
  </svg>
)
