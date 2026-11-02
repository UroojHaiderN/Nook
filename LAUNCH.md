# Launching Nook as a real app

## Launch checklist (live at nook-navy-mu.vercel.app)

Done in the app:

- Splash (plain HTML, on screen before any script; about a second, never longer than 6s).
- Sign in / create account with show–hide password, forgot password → email → set a new
  password, and a "check your inbox" step with a timed resend.
- Share by link (`#/join/<name>-<code>`); `#/signup` for anyone new.
- Voice notes upload to the private `voice` bucket, so everyone on a board hears them;
  offline recordings queue and upload on the next sync.
- Leave a board you don't own; delete a board you do (removed for everyone).
- Delete account (account menu → Delete account…), boards and recordings included.
- Signing out clears the device, so the next person on the browser sees nothing of yours.
- Link previews: `og.png` for iMessage / WhatsApp / Slack.

Needs you, in the Supabase dashboard — the app can't do these:

1. **Run `supabase/migrations/20260926000000_launch.sql`** in the SQL editor (voice bucket
   and account deletion). Until then recordings stay on the device that made them.
2. **Email sending limits.** Supabase's built-in mailer sends only a handful of emails an
   hour across the whole project — sign-up confirmations and password resets both count.
   For launch either set custom SMTP (Authentication → Emails → SMTP; Resend works:
   host `smtp.resend.com`, port 465, user `resend`, password = your Resend key, sender on
   a verified domain), or turn off *Confirm email* (Authentication → Providers → Email) so
   people get straight in.
3. **Email templates** (Authentication → Emails): the defaults say "Supabase". Put Nook's
   name in the confirm-signup and reset-password subjects.
4. **A privacy page.** Nook stores email addresses, boards and voice recordings. Any
   public launch — and both app stores — needs a privacy policy with a contact address.

---

There are two honest answers, and the right one depends on whether you need to be *in the
App Store* or just *on people's phones*.

|  | Web app | App Store / Play Store |
| --- | --- | --- |
| Time to live | Today, ~15 minutes | 1–2 weeks, mostly review |
| Cost | £0 | $99/yr Apple, $25 once Google |
| Installs from | A link | Store search |
| Updates | You deploy, everyone has it | Each update waits for review |
| Needs from you | A host account | Developer accounts, Xcode, certificates, screenshots, privacy policy |

Start with the web app. It is the same code either way, so nothing is wasted if you add
the stores later.

---

## Option A — Ship the web app (today)

Nook is a proper installable app, not a bookmark: it has a manifest, maskable icons, and
a service worker that precaches the whole shell. Verified with the server stopped — the
app still opens and renders from cache.

```bash
cd ~/nook
npm run build          # type-checks, builds, generates the service worker
npx vercel --prod      # or: npx netlify deploy --prod
```

`vercel.json` and `netlify.toml` are already here with SPA rewrites, asset caching and
security headers. Any static host works — the output is just `dist/`.

If you want accounts and emailed invites, set the two Supabase variables in your host's
dashboard first. See [DEPLOY.md](DEPLOY.md).

**What people do with the link**

- **iPhone**: open in *Safari* (not Chrome) → Share → *Add to Home Screen*. It launches
  full-screen with no browser chrome, works offline, records voice notes.
- **Android**: Chrome shows an *Install app* prompt by itself.
- **Desktop**: an install icon appears in the address bar.

**Known limits of this route**

- iOS only offers *Add to Home Screen* from Safari, and you have to tell people it exists
   — there is no store listing doing that job for you.
- No push notifications on iOS unless the user installs to the home screen first.
- Nothing in the App Store search results.

---

## Option B — App Store and Play Store

The same web app wrapped in a native shell with [Capacitor](https://capacitorjs.com). No
rewrite: your React code runs inside, and native plugins give you the real share sheet,
haptics and microphone.

```bash
cd ~/nook
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Nook com.yourname.nook --web-dir=dist
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios        # opens Xcode
```

Then, in Xcode:

1. Set your Team under *Signing & Capabilities* (needs the Apple Developer Program).
2. Add `NSMicrophoneUsageDescription` to `Info.plist` — something like *"Nook records
   voice notes for your shopping boards."* The app is rejected without it, and it is the
   text users see on the permission prompt.
3. Product → Archive → Distribute to App Store Connect.

**Read this before you pay the $99.** Apple's [Guideline
4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality)
rejects apps that are "just a repackaged website". Nook has a real case — microphone
recording, offline storage, share sheet, home-screen widgets-adjacent behaviour — but a
thin wrapper invites a rejection. Strengthen it before submitting:

- Use `@capacitor/share` and `@capacitor/haptics` so the app behaves natively.
- Make sure it works fully with the network off (it does).
- Write the listing around *what the app does*, not "web app for shopping lists".

**Both stores also require**, and I cannot produce these for you:

- A privacy policy at a public URL. Nook collects nothing when running locally; with
  Supabase it stores an email address and your boards. Say exactly that.
- A support URL or email.
- Screenshots at several device sizes, an app description, keywords, an age rating.
- The data-collection questionnaire (App Privacy / Data Safety).

---

## What is genuinely mine to do, and what is yours

I can write and verify the code, the service worker, the deploy config, the Capacitor
setup and the store metadata text. I cannot create your Apple, Google, Vercel, Supabase
or Resend accounts, pay the fees, hold your signing certificates, or press Submit — those
need your identity and your card.

## Before you launch either way

- [ ] Decide local-only or accounts ([DEPLOY.md](DEPLOY.md) step 1)
- [ ] `npm test && npm run build` — both clean
- [ ] Open the deployed URL on a real phone and add it to your home screen
- [ ] Turn on airplane mode and open it again; it should still work
- [ ] Record a voice note on the device to confirm the microphone prompt reads well
- [ ] Privacy policy and support URL live, if you are going to a store
