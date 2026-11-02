import { useState } from 'react'
import PieceMenu from './PieceMenu'
import { useAccount } from '../auth'
import { useBoard } from '../store'
import { removeClipsFor } from '../backend'

/**
 * The account sheet: who you're signed in as, sign out, and delete the account.
 * Deleting asks once more and says exactly what goes with it.
 */
export default function AccountMenu({ onClose }: { onClose: () => void }) {
  const { email, localOnly, signOut, deleteAccount } = useAccount()
  const { boards, isOwner, say } = useBoard()
  const [confirming, setConfirming] = useState(false)

  if (localOnly)
    return (
      <PieceMenu
        title="On this device"
        note="Your boards live in this browser. Nothing is uploaded and no account is needed — which also means they don’t follow you to another device."
        onClose={onClose}
        actions={[]}
      />
    )

  const owned = boards.filter(isOwner)

  if (confirming)
    return (
      <PieceMenu
        title="Delete your account?"
        note={
          owned.length
            ? `This deletes ${owned.length === 1 ? 'your board' : `your ${owned.length} boards`} for everyone on them, and can’t be undone. Boards other people shared with you stay with them.`
            : 'Your account goes for good and can’t be undone. Boards other people shared with you stay with them.'
        }
        onClose={onClose}
        actions={[
          {
            label: 'Delete account',
            destructive: true,
            run: () => {
              void (async () => {
                await removeClipsFor(owned.map((b) => b.id)).catch(() => {})
                const message = await deleteAccount()
                if (message) say(message)
              })()
            },
          },
        ]}
      />
    )

  return (
    <PieceMenu
      title={email ?? 'Account'}
      onClose={onClose}
      actions={[
        { label: 'Sign out', run: () => void signOut() },
        { label: 'Delete account…', destructive: true, keepOpen: true, run: () => setConfirming(true) },
      ]}
    />
  )
}
