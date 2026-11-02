import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff } from './Icons'
import { Circle, Flower, Square, Triangle } from './Shapes'
import { Buddy } from '../landing/Buddies'
import { useAccount } from '../auth'
import { isEmail } from '../types'
import { pendingJoin } from '../store'

type Mode = 'in' | 'up' | 'forgot' | 'check-signup' | 'check-reset'

/** New passwords; signing in still accepts whatever an older account was made with. */
const MIN_PASSWORD = 8

/**
 * Sign in, make an account, or get back into one. Each is one short form, and
 * every email we send ends on a screen that says where it went and what to do.
 */
export default function AuthScreen() {
  const { signIn, signUp, sendReset, resendConfirm } = useAccount()
  // Someone arriving from a board link most likely has no account yet.
  const [invited] = useState(() => pendingJoin() !== null)
  // nook…/signup and nook…/login land here as #/signup and #/login.
  const [mode, setMode] = useState<Mode>(() =>
    location.hash.startsWith('#/login') ? 'in' : invited || location.hash.startsWith('#/signup') ? 'up' : 'in',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const go = (next: Mode) => {
    // The address follows the form, so a refresh or a shared link keeps it.
    if (next === 'up' || next === 'in')
      history.replaceState(null, '', next === 'up' ? '#/signup' : '#/login')
    setMode(next)
    setError(null)
    if (next === 'in' || next === 'up') setPassword('')
  }

  const emailOk = isEmail(email)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!emailOk) return setError('That doesn’t look like an email address.')

    if (mode === 'forgot') {
      setBusy(true)
      const message = await sendReset(email)
      setBusy(false)
      return message ? setError(message) : go('check-reset')
    }

    if (!password) return setError('Enter your password.')
    if (mode === 'up' && password.length < MIN_PASSWORD)
      return setError(`Use at least ${MIN_PASSWORD} characters.`)

    setBusy(true)
    setError(null)
    if (mode === 'in') {
      const message = await signIn(email, password)
      setBusy(false)
      if (message) setError(message)
      return
    }
    const { error: message, confirm } = await signUp(email, password)
    setBusy(false)
    if (message) return setError(message)
    if (confirm) go('check-signup')
  }

  if (mode === 'check-signup' || mode === 'check-reset')
    return (
      <Inbox
        email={email}
        body={
          mode === 'check-signup'
            ? `Tap the link in it to finish making your account${invited ? ' — the board you were sent will be waiting' : ''}.`
            : 'If there’s an account for it, a link to set a new password is on its way.'
        }
        resend={mode === 'check-signup' ? () => resendConfirm(email) : () => sendReset(email)}
        onBack={() => go(mode === 'check-signup' ? 'up' : 'in')}
        backLabel={mode === 'check-signup' ? 'Use a different email' : 'Back to sign in'}
      />
    )

  const title =
    mode === 'forgot'
      ? 'Forgot your password?'
      : invited
        ? 'You’re invited'
        : mode === 'in'
          ? 'Welcome back'
          : 'Make your Nook'
  const sub =
    mode === 'forgot'
      ? 'Enter your email and we’ll send a link to set a new one.'
      : invited
        ? `${mode === 'up' ? 'Make an account' : 'Sign in'} and the board you were sent will be waiting.`
        : mode === 'in'
          ? 'Your boards follow you between devices.'
          : 'Lists, notes and voice memos, shared with the people you live with.'

  return (
    <Frame title={title} sub={sub}>
      <form onSubmit={submit} noValidate>
        <Label htmlFor="auth-email">Email</Label>
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete={mode === 'up' ? 'email' : 'username'}
          autoCapitalize="none"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
          placeholder="name@email.com"
          className={FIELD}
        />

        {mode !== 'forgot' && (
          <>
            <div className="mb-2 mt-4 flex items-baseline justify-between px-1">
              <label htmlFor="auth-pass" className="text-[12px] font-medium text-muted">
                Password
              </label>
              {mode === 'in' && (
                <button
                  type="button"
                  onClick={() => go('forgot')}
                  className="text-[12px] font-medium text-ink underline-offset-2 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="auth-pass"
              value={password}
              onChange={(v) => {
                setPassword(v)
                setError(null)
              }}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              placeholder={mode === 'up' ? `${MIN_PASSWORD} or more characters` : 'Your password'}
            />
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 px-1 text-[13px] leading-snug text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="tap mt-6 h-[58px] w-full rounded-full bg-ink text-[16px] text-on-ink disabled:opacity-40"
        >
          {busy
            ? 'One moment…'
            : mode === 'in'
              ? 'Sign in'
              : mode === 'up'
                ? 'Create account'
                : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        {mode === 'forgot' ? (
          <TextButton onClick={() => go('in')}>Back to sign in</TextButton>
        ) : (
          <>
            {mode === 'in' ? 'New to Nook?' : 'Already have an account?'}{' '}
            <TextButton onClick={() => go(mode === 'in' ? 'up' : 'in')}>
              {mode === 'in' ? 'Create an account' : 'Sign in'}
            </TextButton>
          </>
        )}
      </p>
    </Frame>
  )
}

/** Where a reset link lands: the session is already live, it only needs a password. */
export function NewPasswordScreen() {
  const { setNewPassword } = useAccount()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`)
    setBusy(true)
    const message = await setNewPassword(password)
    setBusy(false)
    if (message) setError(message)
  }

  return (
    <Frame title="Set a new password" sub="Then you’re straight back to your boards.">
      <form onSubmit={submit} noValidate>
        <Label htmlFor="new-pass">New password</Label>
        <PasswordInput
          id="new-pass"
          value={password}
          onChange={(v) => {
            setPassword(v)
            setError(null)
          }}
          autoComplete="new-password"
          placeholder={`${MIN_PASSWORD} or more characters`}
          autoFocus
        />
        {error && (
          <p role="alert" className="mt-3 px-1 text-[13px] leading-snug text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="tap mt-6 h-[58px] w-full rounded-full bg-ink text-[16px] text-on-ink disabled:opacity-40"
        >
          {busy ? 'One moment…' : 'Save password'}
        </button>
      </form>
    </Frame>
  )
}

/** "Check your inbox", with a resend that waits long enough not to be refused. */
function Inbox({
  email,
  body,
  resend,
  onBack,
  backLabel,
}: {
  email: string
  body: string
  resend: () => Promise<string | null>
  onBack: () => void
  backLabel: string
}) {
  const [wait, setWait] = useState(60)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (wait <= 0) return
    const id = window.setTimeout(() => setWait((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [wait])

  return (
    <Frame
      title="Check your inbox"
      sub={
        <>
          We sent an email to <span className="text-ink">{email}</span>. {body}
        </>
      }
    >
      <p className="px-1 text-[13px] leading-snug text-muted">
        Nothing there? Look in spam, or send it again.
      </p>
      {note && <p className="mt-2 px-1 text-[13px] leading-snug text-ink">{note}</p>}
      <button
        disabled={wait > 0}
        onClick={async () => {
          const message = await resend()
          setNote(message ?? 'Sent again.')
          setWait(60)
        }}
        className="tap mt-5 h-[58px] w-full rounded-full bg-ink text-[16px] text-on-ink disabled:opacity-40"
      >
        {wait > 0 ? `Send again in ${wait}s` : 'Send again'}
      </button>
      <p className="mt-6 text-center text-[13px] text-muted">
        <TextButton onClick={onBack}>{backLabel}</TextButton>
      </p>
    </Frame>
  )
}

const FIELD =
  'h-[54px] w-full rounded-full bg-panel px-5 text-[16px] text-ink outline-none ring-ink/20 placeholder:text-muted focus:ring-2'

function Frame({ title, sub, children }: { title: string; sub: ReactNode; children: ReactNode }) {
  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
      {/* Desktop: the brand beside the form, the way a website's sign-in looks. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-lime p-12 lg:flex">
        <a href="/" className="font-display text-[26px] tracking-[-0.04em] text-ink">
          Nook
        </a>
        <div>
          <p className="font-display max-w-md text-[56px] leading-[0.98] tracking-[-0.05em] text-ink">
            The shopping list the whole house can see.
          </p>
          <p className="mt-5 max-w-sm text-[17px] leading-[1.5] text-ink/70">
            Lists, notes and voice memos on one board — shared with a link, synced while you shop.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <Buddy kind="tri" size={84} color="#FFFFFF" />
          <Buddy kind="square" size={72} delay={0.35} mood="wink" />
          <Buddy kind="circle" size={92} delay={0.7} />
          <Buddy kind="flower" size={84} delay={1.05} mood="wow" />
        </div>
      </aside>

      <div className="no-scrollbar lg:h-full lg:overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-center px-6 py-12">
          <div className="mb-9">
            <a href="/" className="mb-6 flex w-fit items-end gap-1.5 lg:hidden" aria-label="Nook home">
              <Triangle className="h-7 w-7" />
              <Square className="h-6 w-6" />
              <Circle className="h-7 w-7" />
              <Flower className="h-7 w-7" />
            </a>
            <h1 className="text-[42px] font-normal leading-[0.98] tracking-[-0.045em] text-ink">
              {title}
            </h1>
            <p className="mt-2 text-[14px] leading-snug text-muted">{sub}</p>
          </div>
          {children}
          <p className="mt-10 text-center text-[12px] text-muted">
            <a href="/" className="hover:text-ink">
              About Nook
            </a>
            <span className="mx-2">·</span>
            <a href="/privacy/" className="hover:text-ink">
              Privacy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block px-1 text-[12px] font-medium text-muted">
      {children}
    </label>
  )
}

function TextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-ink underline underline-offset-2">
      {children}
    </button>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder: string
  autoFocus?: boolean
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${FIELD} pr-14`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="tap absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
      >
        {shown ? <EyeOff className="h-[20px] w-[20px]" /> : <Eye className="h-[20px] w-[20px]" />}
      </button>
    </div>
  )
}
