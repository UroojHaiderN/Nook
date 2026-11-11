import type { ReactNode } from 'react'
import { useEscape } from '../hooks'

export type MenuAction = {
  label: string
  run: () => void
  icon?: ReactNode
  destructive?: boolean
  /** For a step that leads to another sheet rather than finishing. */
  keepOpen?: boolean
}

/**
 * The press-and-hold menu. One sheet, one list of verbs, the destructive one last
 * and set apart — so nothing irreversible sits under a stray thumb.
 */
export default function PieceMenu({
  title,
  note,
  actions,
  onClose,
}: {
  title: string
  /** A line of explanation under the title, when the title alone would not do. */
  note?: string
  actions: MenuAction[]
  onClose: () => void
}) {
  useEscape(onClose)

  return (
    <div className="absolute inset-0 z-40">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/25 backdrop-blur-[2px]"
      />
      <div
        role="menu"
        aria-label={title}
        className="absolute inset-x-2 bottom-[calc(var(--safe-bottom)+8px)] animate-sheet-up overflow-hidden rounded-sheet bg-surface p-3 pb-4 shadow-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[380px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-dialog-in"
      >
        <p className="truncate px-2 pb-2 pt-2 text-[20px] font-semibold tracking-[-0.02em] text-ink">{title}</p>
        {note && <p className="px-2 pb-4 text-[14px] leading-snug text-muted">{note}</p>}
        {actions.length > 0 && (
          <div className="overflow-hidden rounded-[18px] bg-panel">
            {actions.map((a) => (
              <button
                key={a.label}
                role="menuitem"
                onClick={() => {
                  a.run()
                  if (!a.keepOpen) onClose()
                }}
                className={`flex w-full items-center justify-between border-t border-hairline/[0.07] px-4 py-3.5 text-left text-[17px] transition-colors first:border-t-0 active:bg-hairline/[0.06] ${
                  a.destructive ? 'text-danger' : 'text-ink'
                }`}
              >
                {a.label}
                {a.icon}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          className={`tap h-12 w-full rounded-[18px] bg-ink text-[17px] font-medium text-on-ink ${
            actions.length ? 'mt-2' : ''
          }`}
        >
          {actions.length ? 'Cancel' : 'Close'}
        </button>
      </div>
    </div>
  )
}
