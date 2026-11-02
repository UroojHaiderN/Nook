/**
 * Adds someone to a board and emails them the link.
 *
 * Runs on Supabase Edge Functions (Deno). It holds the service role key and the
 * mail credentials, so neither ever reaches the browser. Deploy with:
 *
 *   supabase functions deploy invite-member
 *   supabase secrets set RESEND_API_KEY=... INVITE_FROM="Nook <nook@yourdomain.com>"
 *
 * Without RESEND_API_KEY it still records the membership and returns sent:false,
 * so the app can fall back to opening a mail draft instead of pretending.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  )

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'not signed in' }, 401)

  const { email, boardId, boardTitle, link } = (await req.json().catch(() => ({}))) as Record<
    string,
    string
  >
  if (!email || !isEmail(email)) return json({ error: 'a valid email is required' }, 400)
  if (!boardId) return json({ error: 'boardId is required' }, 400)

  // Who is asking — verified against the caller's own token, not trusted input.
  const caller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const {
    data: { user },
  } = await caller.auth.getUser()
  if (!user) return json({ error: 'not signed in' }, 401)

  // The caller must already be on the board they are inviting to. RLS enforces
  // this for the read, so an empty result means they have no business here.
  const { data: board } = await caller.from('boards').select('id, title').eq('id', boardId).single()
  if (!board) return json({ error: 'board not found' }, 404)

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: memberError } = await admin.from('board_members').upsert({
    board_id: boardId,
    email: email.toLowerCase(),
    invited_by: user.id,
  })
  if (memberError) return json({ error: memberError.message }, 500)

  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return json({ sent: false, reason: 'no mail provider configured' })

  const title = escapeHtml(boardTitle || board.title)
  const inviter = escapeHtml(user.email ?? 'Someone')
  const url = escapeHtml(link)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('INVITE_FROM') ?? 'Nook <onboarding@resend.dev>',
      to: [email],
      subject: `${inviter} added you to "${title}" on Nook`,
      text: `${inviter} added you to "${title}" on Nook.\n\nOpen the board:\n${link}\n\nIf you do not have an account yet, sign up with this address and the board will be waiting.`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111113">
  <p style="font-size:15px;line-height:1.5;margin:0 0 20px">
    <strong>${inviter}</strong> added you to <strong>${title}</strong> on Nook.
  </p>
  <p style="margin:0 0 28px">
    <a href="${url}" style="display:inline-block;background:#111113;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 22px;border-radius:999px">Open the board</a>
  </p>
  <p style="font-size:12px;line-height:1.5;color:#9a9aa0;margin:0">
    Signing up with this address puts the board straight in your account.
  </p>
</div>`,
    }),
  })

  if (!res.ok) {
    const reason = await res.text()
    console.error('resend failed', res.status, reason)
    return json({ sent: false, reason: `mail provider said ${res.status}` })
  }

  return json({ sent: true })
})
