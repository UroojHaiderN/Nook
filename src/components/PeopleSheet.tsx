import { useCallback, useEffect, useState } from 'react'
import { Link, Share, Trash } from './Icons'
import { Avatar } from './Chrome'
import { ago, useBoard } from '../store'
import { useEscape } from '../hooks'
import { backendConfigured } from '../backend'

/**
 * Who is on this board, and the link that adds someone.
 *
 * No email to type and nothing sent on your behalf: you pass the link on however
 * you like, and whoever opens it joins the board once they are signed in. The
 * link is the key, so it can be replaced — everyone already on stays on.
 */
export default function PeopleSheet({ onClose }: { onClose: () => void }) {
  const { board, people, removeMember, boardLink, resetLink, saveNow, say } = useBoard()
  const [copied, setCopied] = useState(false)
  // The link is only worth sending once the board is on the server to be joined.
  const [saved, setSaved] = useState<'saving' | 'yes' | 'no'>('saving')
  useEscape(onClose)

  const boardId = board?.id
  const confirm = useCallback(() => {
    if (boardId) void saveNow(boardId).then((ok) => setSaved(ok ? 'yes' : 'no'))
  }, [boardId, saveNow])
  useEffect(confirm, [confirm])
  const check = () => {
    setSaved('saving')
    confirm()
  }

  if (!board) return null
  const link = boardLink(board.id)
  const others = people.filter((m) => m.status !== 'you')
  const iOwn = !people.some((m) => m.status === 'owner')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      say(link)
    }
  }

  /** The system sheet where there is one — Messages, WhatsApp, Mail, Copy. */
  const share = async () => {
    try {
      await navigator.share({ title: board.title, text: `Join “${board.title}” on Nook`, url: link })
    } catch {
      /* dismissed */
    }
  }
  const canShare = typeof navigator.share === 'function'

  return (
    <div className="absolute inset-0 z-40">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-black/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-label={`Share ${board.title}`}
        className="absolute inset-x-2 bottom-[calc(var(--safe-bottom)+8px)] flex max-h-[80%] animate-sheet-up flex-col rounded-sheet bg-surface p-5 pb-7 shadow-lift sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-dialog-in"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline/10" />
        <p className="font-display text-[24px] font-normal tracking-[-0.03em] text-ink">Share this board</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          {backendConfigured
            ? 'Send this link to anyone. They sign up or sign in, and they’re on the board.'
            : 'Sharing needs accounts, which aren’t set up on this copy of Nook. The link only opens the board on this device.'}
        </p>

        <div className="mt-4 flex h-[52px] items-center gap-2 rounded-full bg-panel p-1.5 pl-4">
          <Link className="h-[17px] w-[17px] shrink-0 text-muted" />
          <span className="min-w-0 flex-1 truncate text-[14px] text-ink" title={link}>
            {link.replace(/^https?:\/\//, '')}
          </span>
          <button
            onClick={() => void copy()}
            disabled={saved !== 'yes'}
            className={`tap h-10 shrink-0 rounded-full px-5 text-[14px] transition-colors disabled:opacity-40 ${
              copied ? 'bg-lime text-ink' : 'bg-ink text-on-ink'
            }`}
          >
            {saved === 'saving' ? 'Saving…' : copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {saved === 'no' && (
          <p className="mt-2 px-1 text-[12px] text-danger">
            This board isn’t saved to your account yet, so the link wouldn’t work.{' '}
            <button onClick={check} className="underline">
              Try again
            </button>
          </p>
        )}

        {canShare && (
          <button
            onClick={() => void share()}
            disabled={saved !== 'yes'}
            className="tap mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline/15 text-[14px] text-ink disabled:opacity-40"
          >
            <Share className="h-[17px] w-[17px]" />
            Send with…
          </button>
        )}

        <p className="mt-5 px-1 text-[12px] font-medium text-muted">On this board</p>
        <ul className="no-scrollbar mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {people.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
              <Avatar person={m} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">
                  {m.name}
                  {((m.status === 'you' && iOwn) || m.status === 'owner') && (
                    <span className="ml-1.5 text-[11px] text-muted">owner</span>
                  )}
                </p>
                <p className="truncate text-[12px] text-muted">
                  {m.status === 'you'
                    ? 'That’s you'
                    : m.status === 'owner'
                      ? m.email ?? 'Made this board'
                      : `${m.email ?? ''}${m.invitedAt ? ` · joined ${ago(m.invitedAt)}` : ''}`}
                </p>
              </div>
              {m.status !== 'you' && m.status !== 'owner' && (
                <button
                  onClick={() => removeMember(m.id)}
                  aria-label={`Remove ${m.name}`}
                  className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted"
                >
                  <Trash className="h-[17px] w-[17px]" />
                </button>
              )}
            </li>
          ))}
          {others.length === 0 && (
            <li className="px-1 py-2 text-[13px] text-muted">
              Just you so far. People show up here as soon as they open the link.
            </li>
          )}
        </ul>

        {backendConfigured && (
          <button
            onClick={() => resetLink(board.id)}
            className="tap mt-2 self-center rounded-full px-3 py-2 text-[12px] text-muted"
          >
            Make a new link — the old one stops working
          </button>
        )}
      </div>
    </div>
  )
}
