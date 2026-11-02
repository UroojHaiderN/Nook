import { Component, type ErrorInfo, type ReactNode } from 'react'
import { hideSplash } from '../splash'

type State = { error: Error | null }

/**
 * A crash should cost you the screen, not the shopping list. Boards live in
 * localStorage, so reloading gets everything back.
 */
export default class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nook crashed:', error, info.componentStack)
    hideSplash(true)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-canvas px-10 text-center">
        <p className="font-display text-[24px] font-normal tracking-[-0.02em] text-ink">Something broke</p>
        <p className="text-[14px] leading-snug text-muted">
          Your boards are safe on this device. Reloading should put things right.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="tap mt-1 rounded-full bg-ink px-5 py-3 text-[15px] font-medium text-on-ink"
        >
          Reload Nook
        </button>
        <p className="mt-2 max-w-full truncate text-[11px] text-muted/70">
          {this.state.error.message}
        </p>
      </div>
    )
  }
}
