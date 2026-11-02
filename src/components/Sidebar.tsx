import { useState } from 'react'
import { More, PersonPlus, Plus, Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import AccountMenu from './AccountMenu'
import { agoShort, greeting, useBoard } from '../store'
import { useLongPress } from '../hooks'
import { useAccount } from '../auth'
import type { Board } from '../types'

function Row({
  board,
  active,
  onOpen,
}: {
  board: Board
  active: boolean
  onOpen: () => void
}) {
  const { renameBoard, deleteBoard, isOwner } = useBoard()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(board.title)
  const press = useLongPress(() => setMenu(true))

  if (renaming)
    return (
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
        className="w-full rounded-full bg-panel px-4 py-2.5 text-[15px] text-ink outline-none"
      />
    )

  return (
    <>
      {/* The ⋯ appears on hover or focus, where the time sat: rename and delete
          shouldn't depend on knowing to right-click. */}
      <div className="group relative">
        <button
          {...press.handlers}
          onClick={() => !press.consumed() && onOpen()}
          aria-current={active ? 'page' : undefined}
          className={`flex w-full items-baseline gap-2 rounded-full py-2.5 pl-4 pr-11 text-left transition-colors ${
            active ? 'bg-panel' : 'hover:bg-panel/60'
          }`}
        >
          <span className={`min-w-0 flex-1 truncate text-[15px] ${active ? 'text-ink' : 'text-ink/70'}`}>
            {board.title}
          </span>
        </button>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-muted transition-opacity group-focus-within:opacity-0 group-hover:opacity-0">
          {agoShort(board.updatedAt)}
        </span>
        <button
          onClick={() => setMenu(true)}
          aria-label={`More for ${board.title}`}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:bg-surface hover:text-ink focus:opacity-100 group-hover:opacity-100"
        >
          <More className="h-[18px] w-[18px]" />
        </button>
      </div>

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

/**
 * The desktop shape: boards always in reach on the left, the open board filling
 * the room on the right. On a phone these are two screens you move between —
 * here there is space for both, so nothing needs to be navigated to.
 */
export default function Sidebar({
  activeId,
  onOpen,
}: {
  activeId: string | null
  onOpen: (id: string) => void
}) {
  const { boards, createBoard } = useBoard()
  const { email } = useAccount()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [account, setAccount] = useState(false)

  const ordered = [...boards].sort((a, b) => b.updatedAt - a.updatedAt)

  const start = () => {
    const id = createBoard(name)
    setName('')
    setCreating(false)
    onOpen(id)
  }

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-hairline/[0.08] bg-surface lg:flex">
      <div className="flex items-center justify-between px-5 pb-4 pt-7">
        <div>
          <span className="font-display block text-[26px] font-normal leading-none tracking-[-0.04em] text-ink">Nook</span>
          <span className="mt-1 block text-[12px] text-muted">{greeting()}</span>
        </div>
        <button
          onClick={() => setAccount(true)}
          aria-label={email ? `Account: ${email}` : 'Where your boards are kept'}
          className="tap grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink"
        >
          {email ? (
            <Avatar person={{ id: 'me', name: email, tint: '#1C1C1E', status: 'you' }} size={26} />
          ) : (
            <PersonPlus className="h-[20px] w-[20px]" />
          )}
        </button>
      </div>

      <div className="px-3">
        {creating ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setCreating(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') start()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Name this board"
            aria-label="Name this board"
            className="w-full rounded-full bg-panel px-4 py-3 text-[15px] text-ink outline-none placeholder:text-muted"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="tap flex w-full items-center gap-2 rounded-full bg-ink px-4 py-3 text-[14px] text-on-ink"
          >
            <Plus className="h-[16px] w-[16px]" strokeWidth={2.4} />
            New board
          </button>
        )}
      </div>

      <p className="px-5 pb-1 pt-6 text-[11px] font-medium uppercase tracking-wider text-muted">
        Boards
      </p>
      <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {ordered.map((b) => (
          <Row key={b.id} board={b} active={b.id === activeId} onOpen={() => onOpen(b.id)} />
        ))}
      </nav>

      {account && <AccountMenu onClose={() => setAccount(false)} />}
    </aside>
  )
}
