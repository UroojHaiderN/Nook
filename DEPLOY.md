# Taking Nook live

Two steps: a Supabase project and a deploy. Fifteen minutes, mostly waiting.

Nothing here needs code changes — the app reads two environment variables and turns
accounts on when it finds them. With them unset it stays the local-only app.

---

## 1. Supabase — accounts and storage

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough).
2. **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   That creates the two tables and, importantly, the row-level-security policies that
   keep one household's boards away from another's.
3. **Authentication → Providers → Email**: leave it on. Turn *Confirm email* on for
   production; turn it off while testing so you aren't waiting on inboxes.
4. **Authentication → URL Configuration**: set *Site URL* to your deployed address, and
   add `http://localhost:5173` to *Redirect URLs* so sign-in works locally too.
5. **Settings → API**: copy the *Project URL* and the *anon public* key.

The anon key belongs in the browser — that is what it is for. The database is protected
by the policies, not by hiding the key.

## 2. Sharing

Nothing to set up. Boards are shared by link (see the README); the database function
`join_board` in `schema.sql` does the work. No mail service is needed.

`supabase/functions/invite-member` is the old email-invite function. The app no longer
calls it; leave it or delete it with `npx supabase functions delete invite-member`.

## 3. Deploy

```bash
npx vercel --prod
```

Set the two variables in the host's dashboard (Vercel: Settings → Environment Variables):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL from step 1 |
| `VITE_SUPABASE_ANON_KEY` | anon public key from step 1 |

`vercel.json` and `netlify.toml` are both here — SPA rewrites, asset caching and
sensible security headers are already set. Any static host works; the build output is
`dist/`.

Locally, copy `.env.example` to `.env` with the same two values.

---

## Check it worked

1. Open the deployed URL → you should get the sign-in screen, not a board.
2. Create an account with a real address → confirm the email → you land on an empty
   **Weekly shop** board.
3. Add an item. Open Supabase → **Table Editor → boards** → your board is there, item
   included.
4. Copy a board's link from the people sheet, open it in a private window, sign up with
   a second address → you land on that board, and the first account sees you listed.
5. Sign out, sign back in on another device → the boards follow you.

## What this is and isn't

- **Sync is last-write-wins per board.** Two people editing the same list at the same
  second: the later write takes it. Fine for a household, wrong for a team of twenty.
  Realtime subscriptions or per-piece writes are the upgrade path.
- **Voice recordings stay on the device that recorded them.** The audio lives in
  IndexedDB, not in Supabase Storage. Others see the note and the waveform, not the
  audio. Moving it to a storage bucket is the obvious next step.
- **Anyone on a board can edit it**; only the owner can delete it. That is enforced in
  the policies, not just in the UI.
