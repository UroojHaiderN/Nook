import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { backendConfigured, supabase } from './backend'

type Account = {
  /** null while we are still asking Supabase who is signed in. */
  ready: boolean
  session: Session | null
  email: string | null
  userId: string | null
  /** True when there is no backend at all — the app runs on this device only. */
  localOnly: boolean
  /** Signed in on this device, but the server can't be reached right now. */
  offline: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirm: boolean }>
  signIn: (email: string, password: string) => Promise<string | null>
  /** Email a password-reset link. */
  sendReset: (email: string) => Promise<string | null>
  /** Send the sign-up confirmation again. */
  resendConfirm: (email: string) => Promise<string | null>
  /** True after arriving from a reset link: the next screen asks for a new password. */
  recovering: boolean
  setNewPassword: (password: string) => Promise<string | null>
  /** Gone for good: the account, and every board it owns. */
  deleteAccount: () => Promise<string | null>
  signOut: () => Promise<void>
}

/** Where email links land: the app, not the website in front of it. */
const APP_URL = `${window.location.origin}/app/`

const AuthCtx = createContext<Account | null>(null)

/**
 * Who this browser was last signed in as, read from Supabase's own saved
 * session. When the server can't be reached — no signal, or the project is
 * down — this is what lets someone still open the boards on their device
 * instead of staring at a splash screen or being sent to sign in.
 */
const storedUser = (): { id: string; email: string | null } | null => {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!/^sb-.+-auth-token$/.test(key)) continue
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
      const user = saved?.user ?? saved?.currentSession?.user
      if (user?.id) return { id: user.id, email: user.email ?? null }
    }
  } catch {
    /* storage blocked */
  }
  return null
}

/** How long to wait for the server before carrying on with what's on the device. */
const WAIT_MS = 2500

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!backendConfigured)
  const [recovering, setRecovering] = useState(false)
  const [cached, setCached] = useState(storedUser)

  useEffect(() => {
    if (!supabase) return
    // Don't hold the whole app hostage to a slow or unreachable server.
    const giveUp = window.setTimeout(() => setReady(true), WAIT_MS)
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        setSession(data.session)
        // A clean "nobody is signed in" from the server means exactly that;
        // a network failure says nothing about who you are, so keep the device's word.
        if (data.session || !error) setCached(null)
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(giveUp)
        setReady(true)
      })
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (next) setCached(null)
      if (event === 'SIGNED_OUT') setCached(null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => {
      window.clearTimeout(giveUp)
      sub.subscription.unsubscribe()
    }
  }, [])

  /** Supabase errors are readable enough to show, but not always kind. */
  const humanise = (message: string) => {
    const m = message.toLowerCase()
    if (m.includes('invalid login')) return 'That email and password do not match.'
    if (m.includes('already registered')) return 'That address already has an account — sign in.'
    if (m.includes('for security purposes') || m.includes('seconds'))
      return 'Just sent one — give it a minute before asking again.'
    if (m.includes('same password') || m.includes('different from the old'))
      return 'Pick a password you haven’t used here before.'
    if (m.includes('password')) return 'Password needs to be at least 8 characters.'
    if (m.includes('rate limit') || m.includes('too many'))
      return 'Too many attempts just now. Try again in a minute.'
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed'))
      // Online but no answer means it's us, not them.
      return navigator.onLine
        ? 'Nook’s server isn’t answering right now. Please try again in a few minutes.'
        : 'You’re offline. Check your connection and try again.'
    if (m.includes('email not confirmed'))
      return 'Confirm the address from the email we sent, then sign in.'
    return message
  }

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'No backend configured', confirm: false }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: APP_URL },
    })
    if (error) return { error: humanise(error.message), confirm: false }
    // No session back means the project wants the address confirmed first.
    return { error: null, confirm: !data.session }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'No backend configured'
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    return error ? humanise(error.message) : null
  }, [])

  const sendReset = useCallback(async (email: string) => {
    if (!supabase) return 'No backend configured'
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: APP_URL,
    })
    return error ? humanise(error.message) : null
  }, [])

  const resendConfirm = useCallback(async (email: string) => {
    if (!supabase) return 'No backend configured'
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: APP_URL },
    })
    return error ? humanise(error.message) : null
  }, [])

  const setNewPassword = useCallback(async (password: string) => {
    if (!supabase) return 'No backend configured'
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return humanise(error.message)
    setRecovering(false)
    return null
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!supabase) return 'No backend configured'
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return humanise(error.message)
    await supabase.auth.signOut()
    return null
  }, [])

  const signOut = useCallback(async () => {
    setCached(null)
    await supabase?.auth.signOut().catch(() => {})
  }, [])

  const value = useMemo<Account>(
    () => ({
      ready,
      session,
      email: session?.user.email ?? cached?.email ?? null,
      userId: session?.user.id ?? cached?.id ?? null,
      localOnly: !backendConfigured,
      offline: !session && !!cached,
      signUp,
      signIn,
      sendReset,
      resendConfirm,
      recovering,
      setNewPassword,
      deleteAccount,
      signOut,
    }),
    [ready, session, cached, signUp, signIn, sendReset, resendConfirm, recovering, setNewPassword, deleteAccount, signOut],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAccount() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAccount must be used inside AuthProvider')
  return ctx
}
