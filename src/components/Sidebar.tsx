import { useState } from 'react'
import { More, PersonPlus, Plus, Trash } from './Icons'
import { Avatar } from './Chrome'
import PieceMenu from './PieceMenu'
import AccountMenu from './AccountMenu'
import { agoShort, greeting, useBoard } from '../store'
import { useLongPress } from '../hooks'
import { BoardTile } from './Shapes'
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
        className="w-full rounded-[12px] bg-panel px-3 py-2.5 text-[15px] text-ink outline-none"
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
          className={`flex w-full items-center gap-3 rounded-[14px] py-2 pl-2 pr-11 text-left transition-colors ${
            active ? 'bg-lav' : 'hover:bg-hairline/[0.04]'
          }`}
        >
          <BoardTile board={board} size={28} />
          <span className={`min-w-0 flex-1 truncate text-[15px] ${active ? 'font-medium text-lav-ink' : 'text-ink'}`}>
            {board.title}
          </span>
        </button>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-muted transition-opacity group-focus-within:opacity-0 group-hover:opacity-0">
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
    <aside className="hidden w-[288px] shrink-0 flex-col border-r border-hairline/[0.06] bg-canvas lg:flex">
      <div className="flex items-center justify-between px-5 pb-4 pt-7">
        <div>
          <span className="block text-[24px] font-bold leading-none tracking-[-0.025em] text-ink">Nook</span>
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
            className="w-full rounded-[16px] bg-surface px-4 py-3 text-[15px] text-ink shadow-card outline-none placeholder:text-muted"
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="tap flex w-full items-center gap-3 rounded-[16px] bg-surface p-1.5 text-[15px] font-medium text-ink shadow-card"
          >
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-ink text-on-ink">
              <Plus className="h-[16px] w-[16px]" strokeWidth={2.4} />
            </span>
            New board
          </button>
        )}
      </div>

      <p className="px-5 pb-2 pt-6 text-[13px] font-medium text-muted">Boards</p>
      <nav className="no-scrollbar mx-3 mb-4 flex-1 space-y-0.5 overflow-y-auto rounded-[22px] bg-surface p-1.5 [align-self:stretch] [flex:0_1_auto]">
        {ordered.map((b) => (
          <Row key={b.id} board={b} active={b.id === activeId} onOpen={() => onOpen(b.id)} />
        ))}
      </nav>

      {account && <AccountMenu onClose={() => setAccount(false)} />}
    </aside>
  )
}
