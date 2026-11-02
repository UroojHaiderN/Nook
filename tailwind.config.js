/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/index.html', './privacy/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Instrument Sans for reading and controls; Bricolage Grotesque for the
        // big type — titles, headings, the wordmark — where Nook gets its voice.
        sans: ['"Instrument Sans Variable"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Instrument Sans Variable"', '-apple-system', 'sans-serif'],
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'on-ink': 'rgb(var(--on-ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        page: 'rgb(var(--page) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        wave: 'rgb(var(--wave) / <alpha-value>)',
        scrim: 'rgb(var(--scrim) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',

        'on-block': 'rgb(var(--on-block) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        lime: 'rgb(var(--lime) / <alpha-value>)',
        lilac: 'rgb(var(--lilac) / <alpha-value>)',
        cobalt: 'rgb(var(--cobalt) / <alpha-value>)',
        tomato: 'rgb(var(--tomato) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,28,30,0.04), 0 10px 24px -14px rgba(28,28,30,0.14)',
        lift: '0 2px 8px rgba(28,28,30,0.06), 0 24px 48px -20px rgba(28,28,30,0.22)',
        pill: '0 1px 2px rgba(28,28,30,0.05), 0 14px 30px -16px rgba(28,28,30,0.2)',
        sticky: '0 4px 12px rgba(28,28,30,0.06), 0 30px 60px -28px rgba(28,28,30,0.28)',
      },
      borderRadius: {
        card: '22px',
        block: '22px',
        sheet: '28px',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(110%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '65%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'check-in': {
          '0%': { transform: 'scale(0.7)' },
          '55%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        'note-in': {
          '0%': { transform: 'translateY(14px) rotate(0deg) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(-3deg) scale(1)', opacity: '1' },
        },
        'toast-in': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '12%': { transform: 'translateY(0)', opacity: '1' },
          '88%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(8px)', opacity: '0' },
        },
        'toast-long': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '6%': { transform: 'translateY(0)', opacity: '1' },
          '94%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(8px)', opacity: '0' },
        },
        /* A card gives a little when you tick it off. */
        squish: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(0.94, 0.9)' },
          '60%': { transform: 'scale(1.03, 1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        /* ...and the thing on it hops into the basket. */
        hop: {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '35%': { transform: 'translateY(-16px) rotate(-8deg)' },
          '70%': { transform: 'translateY(2px) rotate(3deg)' },
          '100%': { transform: 'translateY(0) rotate(0deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(6deg)' },
        },
        /* Waveform bars ahead of the playhead, breathing. */
        breathe: {
          '0%, 100%': { transform: 'scaleY(1)' },
          '50%': { transform: 'scaleY(1.7)' },
        },
        confetti: {
          '0%': { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: '1' },
          '100%': {
            transform: 'translate(var(--dx), var(--dy)) rotate(var(--spin)) scale(0.6)',
            opacity: '0',
          },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 360ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 240ms ease-out',
        'pop-in': 'pop-in 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'check-in': 'check-in 340ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'note-in': 'note-in 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        'toast-in': 'toast-in 2200ms ease-out forwards',
        'toast-long': 'toast-long 4500ms ease-out forwards',
        squish: 'squish 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        hop: 'hop 560ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        wiggle: 'wiggle 420ms ease-in-out',
        breathe: 'breathe 520ms ease-in-out infinite',
        confetti: 'confetti 900ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
