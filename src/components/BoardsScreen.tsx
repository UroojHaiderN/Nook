import { useMemo, useState } from 'react'
import { Back, PersonPlus, Plus, Search, Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import AccountMenu from './AccountMenu'
import { BoardTile, ShapeCluster } from './Shapes'
import { ago, greeting, useBoard } from '../store'
import { useAccount } from '../auth'
import { useEscape, useLongPress } from '../hooks'
import { nameFromEmail, tintFor, type Board, type Member } from '../types'

/** Search only earns its place once a list is long enough to get lost in. */
const SEARCH_AT = 6

function BoardRow({ board, onOpen }: { board: Board; onOpen: () => void }) {
  const { renameBoard, deleteBoard, isOwner } = useBoard()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(board.title)
  const press = useLongPress(() => setMenu(true))

  const { userId } = useAccount()
  // Synced boards know who joined; a board on this device only knows what it stored.
  const members: Member[] = (
    board.joined
      ? [
          ...(board.owner && board.owner !== userId && board.ownerEmail ? [board.ownerEmail] : []),
          ...board.joined.filter((j) => j.userId !== userId).map((j) => j.email),
        ].map((email) => ({ id: email, name: nameFromEmail(email) || email, tint: tintFor(email), status: 'joined' as const }))
      : board.members.filter((m) => m.status !== 'you')
  ).slice(0, 3)
  const left = board.pieces.filter((p) => p.kind === 'item' && !p.done).length

  const body = (
    <>
      <BoardTile board={board} size={40} />
      <span className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 border-t border-hairline/[0.07] py-2.5 pr-4 group-first/board:border-t-0">
        <span className="min-w-0 flex-1">
          {renaming ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                renameBoard(board.id, title)
                setRenaming(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameBoard(board.id, title)
                  setRenaming(false)
                }
                if (e.key === 'Escape') setRenaming(false)
              }}
              aria-label="Board name"
              className="w-full rounded-lg bg-panel px-2 py-0.5 text-[17px] font-medium text-ink outline-none"
            />
          ) : (
            <span className="block truncate text-[17px] font-medium tracking-[-0.01em] text-ink">{board.title}</span>
          )}
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {board.pieces.length === 0 ? 'Empty' : `${left ? `${left} to get · ` : ''}${ago(board.updatedAt)}`}
          </span>
        </span>
        {members.length > 0 && (
          <span className="flex -space-x-1.5">
            {members.map((m) => (
              <Avatar key={m.id} person={m} size={22} ring />
            ))}
          </span>
        )}
        <Back className="h-[16px] w-[16px] shrink-0 rotate-180 text-muted/60" strokeWidth={2.2} />
      </span>
    </>
  )

  return (
    <>
      {renaming ? (
        <div className="group/board flex w-full items-center gap-3.5 pl-4">{body}</div>
      ) : (
        <button
          {...press.handlers}
          onClick={() => !press.consumed() && onOpen()}
          className="group/board flex w-full cursor-pointer items-center gap-3.5 pl-4 text-left transition-colors hover:bg-hairline/[0.025] active:bg-hairline/[0.05]"
        >
          {body}
        </button>
      )}

      {menu && (
        <PieceMenu
          title={board.title}
          note={
            !isOwner(board)
              ? 'Leaving takes it off your list. It stays for everyone else.'
              : board.joined?.length
                ? 'Deleting removes it for everyone on it.'
                : undefined
          }
          onClose={() => setMenu(false)}
          actions={[
            { label: 'Rename', run: () => setRenaming(true) },
            {
              label: isOwner(board) ? 'Delete board' : 'Leave board',
              destructive: true,
              icon: <Trash className="h-[17px] w-[17px]" />,
              run: () => deleteBoard(board.id),
            },
          ]}
        />
      )}
    </>
  )
}

export default function BoardsScreen({
  onOpen,
  embedded = false,
}: {
  onOpen: (id: string) => void
  /** Beside the sidebar, which already has the account button and New board. */
  embedded?: boolean
}) {
  const { boards, createBoard, loading } = useBoard()
  const { email } = useAccount()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [account, setAccount] = useState(false)

  useEscape(() => setCreating(false), creating)

  const visible = useMemo(
    () =>
      boards
        .filter((b) => b.title.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [boards, query],
  )

  const start = () => {
    const id = createBoard(name)
    setName('')
    setCreating(false)
    onOpen(id)
  }

  return (
    <div className="relative flex h-full flex-col bg-canvas">
      <header className="mx-auto w-full max-w-[720px] shrink-0 px-5 pb-3 pt-[calc(var(--safe-top)+16px)] sm:px-6 sm:pt-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-muted">{greeting()}</p>
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] text-ink">
              Your boards
            </h1>
          </div>
          {!embedded && (
          <button
            onClick={() => setAccount(true)}
            aria-label={email ? `Account: ${email}` : 'Where your boards are kept'}
            className="tap -mr-2 mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted"
          >
            {email ? (
              <Avatar person={{ id: 'me', name: email, tint: '#111113', status: 'you' }} size={30} />
            ) : (
              <PersonPlus className="h-[22px] w-[22px]" />
            )}
          </button>
          )}
        </div>

        {boards.length >= SEARCH_AT && (
          <div className="mt-4 flex h-[40px] items-center gap-2 rounded-[12px] bg-hairline/[0.06] px-3">
            <Search className="h-[16px] w-[16px] text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a board"
              aria-label="Find a board"
              className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
            />
          </div>
        )}
      </header>

      <main className="no-scrollbar mx-auto w-full max-w-[720px] flex-1 overflow-y-auto px-3 pb-[120px] pt-1 sm:px-6">
        {visible.length === 0 && loading ? (
          <div className="mt-20 flex animate-pulse flex-col items-center px-10 text-center" role="status">
            <ShapeCluster />
            <p className="mt-6 text-[15px] text-muted">Getting your boards…</p>
          </div>
        ) : visible.length === 0 && query ? (
          <div className="mt-2 rounded-card bg-surface p-6">
            <p className="text-[17px] font-semibold text-ink">No board by that name</p>
            <p className="mt-1 text-[14px] text-muted">Try a different word, or start a new one.</p>
          </div>
        ) : visible.length === 0 ? (
          /* First visit: nothing made for you, one tap to make your own. */
          <div className="mt-2 rounded-card bg-surface p-6">
            <div className="-my-4 origin-left scale-[0.6]">
              <ShapeCluster />
            </div>
            <p className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
              Make your first board
            </p>
            <p className="mt-1.5 text-[15px] leading-snug text-muted">
              One board for each shop, trip or plan — the list, notes and voice memos for it in one
              place, shared with whoever’s in on it. Pick a name to start:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Weekly shop', 'House stuff', 'Birthday party', 'Weekend trip'].map((n) => (
                <button
                  key={n}
                  onClick={() => onOpen(createBoard(n))}
                  className="tap rounded-full bg-lav px-4 py-2.5 text-[15px] text-lav-ink"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setCreating(true)}
                className="tap rounded-full bg-ink px-4 py-2.5 text-[15px] text-on-ink"
              >
                Name my own…
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-card bg-surface py-1">
              {visible.map((b) => (
                <BoardRow key={b.id} board={b} onOpen={() => onOpen(b.id)} />
              ))}
            </div>
            <p className="px-4 pt-3 text-[12px] text-muted">
              <span className="[@media(hover:hover)]:hidden">Press and hold a board to rename or delete it.</span>
              <span className="hidden [@media(hover:hover)]:inline">Right-click a board to rename or delete it.</span>
            </p>
          </>
        )}
      </main>

      {account && <AccountMenu onClose={() => setAccount(false)} />}

      {(!embedded || creating) && (
      <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[110px] bg-gradient-to-t from-canvas via-canvas/90 to-transparent" />
      <div className="absolute inset-x-3 bottom-[calc(var(--safe-bottom)+14px)] z-20 mx-auto max-w-[560px] sm:inset-x-6">
        {creating ? (
          <div className="flex h-[58px] items-center gap-2 rounded-full bg-surface p-2 pl-5 shadow-[0_1px_2px_rgba(28,28,30,0.06),0_16px_36px_-12px_rgba(28,28,30,0.22)] ring-1 ring-hairline/[0.05]">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder="Name this board"
              aria-label="Name this board"
              className="w-full min-w-0 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted/80"
            />
            <button
              onClick={start}
              className="tap h-[42px] shrink-0 rounded-[15px] bg-ink px-5 text-[15px] font-medium text-on-ink"
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="tap flex h-[58px] w-full items-center gap-3 rounded-full bg-surface p-2 text-[17px] font-medium text-ink shadow-[0_1px_2px_rgba(28,28,30,0.06),0_16px_36px_-12px_rgba(28,28,30,0.22)] ring-1 ring-hairline/[0.05]"
          >
            <span className="grid h-[42px] w-[42px] place-items-center rounded-[15px] bg-ink text-on-ink">
              <Plus className="h-[20px] w-[20px]" strokeWidth={2.4} />
            </span>
            New board
          </button>
        )}
      </div>
      </>
      )}
    </div>
  )
}
