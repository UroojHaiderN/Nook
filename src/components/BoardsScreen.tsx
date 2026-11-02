import { useMemo, useState } from 'react'
import { PersonPlus, Plus, Search, Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import AccountMenu from './AccountMenu'
import { ShapeCluster } from './Shapes'
import { ago, greeting, useBoard } from '../store'
import { useAccount } from '../auth'
import { useEscape, useLongPress } from '../hooks'
import { boardBlock, nameFromEmail, tintFor, type Board, type Member } from '../types'

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
  const block = boardBlock(board)

  if (renaming)
    return (
      <div className="rounded-card p-5" style={{ background: block.bg }}>
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
          className="w-full bg-transparent text-[26px] font-normal tracking-[-0.035em] text-ink outline-none"
        />
      </div>
    )

  return (
    <>
      <button
        {...press.handlers}
        onClick={() => !press.consumed() && onOpen()}
        className="tap flex min-h-[112px] w-full cursor-pointer items-end gap-3 rounded-card p-5 text-left"
        style={{ background: block.bg, color: block.ink }}
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-[26px] font-normal leading-[1.05] tracking-[-0.035em]">{board.title}</p>
          <p className="mt-1.5 text-[13px] opacity-60">
            {board.pieces.length === 0 ? 'Empty' : ago(board.updatedAt)}
          </p>
        </div>
        <div className="flex -space-x-1.5">
          {members.map((m) => (
            <Avatar key={m.id} person={m} size={22} ring />
          ))}
        </div>
      </button>

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

export default function BoardsScreen({ onOpen }: { onOpen: (id: string) => void }) {
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
      <header className="mx-auto w-full max-w-5xl shrink-0 px-5 pb-3 pt-[calc(var(--safe-top)+20px)] sm:px-8 sm:pt-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium text-muted">{greeting()}</p>
            <h1 className="text-[36px] font-normal leading-[1.02] tracking-[-0.04em] text-ink sm:text-[48px]">
              Your boards
            </h1>
          </div>
          <button
            onClick={() => setAccount(true)}
            aria-label={email ? `Account: ${email}` : 'Where your boards are kept'}
            className="tap -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"
          >
            {email ? (
              <Avatar person={{ id: 'me', name: email, tint: '#111113', status: 'you' }} size={30} />
            ) : (
              <PersonPlus className="h-[21px] w-[21px]" />
            )}
          </button>
        </div>

        {boards.length >= SEARCH_AT && (
          <div className="mt-4 flex h-[44px] items-center gap-2 rounded-full bg-surface px-4 shadow-card">
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

      <main className="no-scrollbar mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 pb-[120px] pt-1 sm:px-8">
        {visible.length === 0 && loading ? (
          <div className="mt-20 flex animate-pulse flex-col items-center px-10 text-center" role="status">
            <ShapeCluster />
            <p className="mt-6 text-[15px] text-muted">Getting your boards…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-20 flex flex-col items-center px-10 text-center">
            <ShapeCluster />
            <p className="font-display mt-6 text-[24px] font-normal tracking-[-0.03em] text-ink">
              {query ? 'No board by that name' : 'No boards yet'}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              {query ? 'Try a different word, or start a new one.' : 'Start one below.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((b) => (
                <BoardRow key={b.id} board={b} onOpen={() => onOpen(b.id)} />
              ))}
            </div>
            <p className="px-1 pt-3 text-center text-[11px] text-muted">
              <span className="[@media(hover:hover)]:hidden">Press and hold a board to rename or delete it.</span>
              <span className="hidden [@media(hover:hover)]:inline">Right-click a board to rename or delete it.</span>
            </p>
          </>
        )}
      </main>

      {account && <AccountMenu onClose={() => setAccount(false)} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[120px] bg-gradient-to-t from-canvas via-canvas to-transparent" />
      <div className="absolute inset-x-4 bottom-[calc(var(--safe-bottom)+16px)] z-20 mx-auto max-w-xl sm:inset-x-8">
        {creating ? (
          <div className="flex h-[58px] items-center gap-1.5 rounded-full bg-surface/85 p-2 pl-4 shadow-pill backdrop-blur-xl">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              placeholder="Name this board"
              aria-label="Name this board"
              className="w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
            />
            <button
              onClick={start}
              className="tap h-[42px] shrink-0 rounded-full bg-lime px-5 text-[15px] text-ink"
            >
              Create
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="tap flex h-[58px] w-full items-center justify-center gap-2 rounded-full bg-ink text-[16px] text-on-ink"
          >
            <Plus className="h-[19px] w-[19px]" strokeWidth={2.2} />
            New board
          </button>
        )}
      </div>
    </div>
  )
}
