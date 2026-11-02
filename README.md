# Nook

Shopping lists, notes and voice memos on one shared board. A working build of the
concept: clarity over clutter, soft hierarchy, micro-interactions that guide rather
than distract.

```bash
npm install
npm run dev
```

`npm test` runs the unit tests, `npm run build` type-checks and builds.
To put it on a phone, see **[LAUNCH.md](LAUNCH.md)** — web app today, or the stores via
Capacitor. Backend setup is in [DEPLOY.md](DEPLOY.md).

## Two modes

**Local** (default, no setup): everything lives in the browser. Boards in `localStorage`
under `nook.state.v4`, voice recordings in IndexedDB (`nook-audio`). No accounts, no
network, works offline.

**With an account**: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and Nook gains
email sign-in, boards that follow the account between devices, and boards shared by
link. Nothing else changes — same screens, same gestures. See
[DEPLOY.md](DEPLOY.md) for the fifteen-minute setup, and `supabase/schema.sql` for the
tables and the row-level-security policies that keep households apart.

A first run creates one empty board of your own — no sample data in a real user's
account. Open `/?demo` on a fresh browser (or after clearing storage) to load the three
sample boards instead, for showing the app off.

## On a browser

The app fills the window at every size, because it is a website, not a phone mockup:

| Width | Layout |
| --- | --- |
| Phone | Two columns, bottom bar across the width, sheets slide up from the bottom |
| Tablet (≥768px) | Three columns, content capped and centred |
| Desktop (≥1024px) | Four columns, max 1024px column, sheets become centred dialogs |

The drawn phone — bezel, status bar, home indicator — still exists for design shots and
screenshots. It is behind **`?frame`**, so it is one URL away without being the product.

**After a deploy**, the service worker that makes Nook work offline also means the page
you already have is the old one. When the new worker takes over, the app reloads itself
once so the update is invisible rather than confusing — without that, every visitor sees
the previous version until they happened to load twice. `document.documentElement
.dataset.build` reports which build a browser is actually running.

## The screens

**Boards** (`src/components/BoardsScreen.tsx`) — every board with when it last changed and
who is on it. Press and hold a
board to rename or delete it; deleting offers an Undo before it is gone. Search finds a
board by name; `+` names and opens a new one.

**Board** (`src/components/BoardScreen.tsx`)

- Board title and when it last changed. No running tally of what's left — the board
  itself is the status.
- Mixed grid of pieces — items, sticky notes and voice notes — packed dense so a
  full-width voice card never leaves a hole beside it.
- Tap the ring to mark something as got; tap the quantity badge and it unfolds into a
  stepper, then quietly folds back.
- Tap an item for its actions — edit, mark as got, delete. Press and hold does the same,
  but nothing important hides behind a gesture. The check ring and the quantity badge keep
  doing their own job and don't open the sheet.
- **Clear got items** sits in the View popover, and only appears once something is
  checked off — one move to empty the list after a shop. Undoable, like every delete.
- `I need…` does double duty: it filters the board as you type, and return adds what you
  typed as an item. `2 rose lemonade 250ml` → quantity 2, size 250ml, filed under Drinks.
- One **View** control in the header holds everything about how the board is shown:
  order (board order / still to get / **by aisle** / newest) and hide-what's-got. It
  stays solid while any of it is set, so a filtered board never reads as an empty one.
- **By aisle** groups the board the way you walk a shop — notes and memos first, because
  they are instructions for the trip, then the things to pick up under Produce, Bakery,
  Dairy & eggs, Meat & fish, Pantry, Snacks, Drinks, Household. Each section is its own
  grid, so dense packing tidies holes within a section but can never pull a card under
  the wrong heading.
- One bar at the bottom, two jobs: say what you need, or press + for a note or a memo.
- Empty states say why the board looks empty — no search match, everything filtered out,
  or genuinely nothing yet — and each offers the fix.

**Note** (`src/components/NoteScreen.tsx`) — the board stays mounted underneath, so the
blur behind the sticky note is the real board. The note is editable and saves as you
type. Six colours apply live to the note and to its card on the board. Category and
collaborator chips toggle on tap. Draw is real freehand with undo, and anything drawn
also shows on the board card. Share hands off to the system share sheet, falling back to
the clipboard. There is no Save button because there is nothing to save — every keystroke
is already written — so the third action is **Done**, which closes the note.

## People

A board starts with one member: you. The person icon in the board header opens the people
sheet.

**Sharing is a link, not an email.** The sheet shows the board's link with **Copy link**
(and **Send with…** where the system share sheet exists). Whoever opens it signs up or
signs in and is on the board — no address to type, nothing sent on your behalf.

The link is `#/join/<board>/<token>`. The token is a secret stored on the board, and
`join_board()` in the database is the only way to redeem it (signed-in users only). The
link is caught before anything renders and kept on the device, so it survives sign-up
and the confirmation email; it is redeemed the moment there is an account.

Who is on a board comes from the `board_members` table, never from the board document,
so an owner's stale copy can't write someone out. Removing someone deletes their
membership and offers **New link**; making a new link kills every old one, while
everyone already on stays on. Boards refresh when you come back to the tab and every
15 seconds while it's open, so a shared list keeps up.

Without a backend there are no accounts, so the sheet says sharing isn't available and the
link only opens the board on this device.

Nothing in the app ships with invented people in it. Every name you see came from an
address you typed.

## Product icons

Item cards look up a picture for what you typed. `src/producticons.ts` holds a 267-word
catalogue (groceries, drinks, household, party) mapping to **Fluent Emoji Flat** — a set
by Microsoft, MIT licensed — served by the free [Iconify](https://iconify.design) API,
no key required. The last matching word wins, so "organic oat milk" finds the milk.

Three rules keep a network dependency from becoming a liability:

1. Every icon is fetched once and cached in `localStorage`, so it costs nothing after.
2. A miss is cached too — an unmatched item never asks twice.
3. Any failure — offline, rate limit, no match — falls back to the drawn artwork in
   `ProductArt.tsx`. The grid never waits on the network and never shows a hole.

Anything the catalogue misses gets one search request against the same API, and that
answer is cached as well. Fetched SVGs are rendered inside an `<img>`, which cannot run
scripts, so third-party markup never enters the document.

Flaticon was the original ask, but its free tier requires visible attribution and
forbids hotlinking, and its API needs a key on a paid plan — not something to depend on
at launch. If you get a licence, the same component can point at files in `public/`.

## Look

White ground, grey `#F2F2F5` panels, and four colour blocks: lime `#E2F16B`, lilac
`#DBB8F2`, cobalt `#4450D6` (white text on it) and tomato `#F0582F`. Type is Inter
Variable, self-hosted and precached, set large and at regular weight — size carries the
hierarchy, not boldness. Cards are outlined, not shadowed; buttons and the add bar are
black pills. Boards wear a block colour picked once, least-used first, so neighbours
rarely match. Empty states use four plain shapes (triangle, square, circle, flower) in
the same colours. The tokens live in `src/index.css`, the note and board colours in
`src/types.ts`.

## Delight

Fun comes from motion and words — the confetti uses the same four colours.

- **Ticking something off** throws a little burst of paper, the card gives, and the item
  hops into the basket. Un-ticking gets none of it; undoing is not an achievement.
- **Finishing a list** throws a bigger burst and says something about it.
- **Sticky notes sit slightly crooked**, like real paper, and straighten when you reach
  for them. The angle comes from the note's id, so a note always leans the same way.
- **Hovering a card** gives its illustration a small shuffle; new cards pop in.
- **Voice notes breathe** — the bars just ahead of the playhead pulse while it plays.
- **The add field suggests things** ("I need… 6 eggs", "…sourdough") which also teaches
  the quantity-and-size syntax without a tooltip.
- **A hello that knows the time**, and empty states that sound like a person.

Confetti uses the note-paper pastels already in the app, lives in one fixed layer so card
edges do not clip it, and is skipped entirely under `prefers-reduced-motion`.

## Voice notes

Recording (`+` → Voice) uses the microphone through `MediaRecorder`: the bars follow the
real input level, the saved waveform is built from those levels, the audio goes to
IndexedDB, and recording stops itself at two minutes. If the mic is unavailable or
denied, the note is still added and labelled as saved without audio.

The two seeded clips have no audio file to ship, so they carry a transcript and are read
aloud by the speech synthesiser. One clip plays at a time — starting one stops the other.
Recordings whose note has been deleted are pruned from IndexedDB at startup.

## Ready to ship

- **A visible account state.** The control in the boards header says which mode you are
  in: your address and a sign-out when there is a backend, or "on this device" with an
  explanation when there is not. It never offers a sign-in that cannot work.
- **Installable, and genuinely offline.** Manifest, maskable icon, apple-touch-icon,
  per-scheme theme colour, and a service worker that precaches the whole shell. Verified
  by stopping the server and reloading: the app still opens and renders. Fetched product
  icons are cached separately, so they survive too.
- **Crash guard.** An error boundary keeps a rendering bug from costing you the screen,
  and says plainly that your boards are safe on the device.
- **Nothing decorative.** Every control left on screen does something no other control
  does — the rest was cut rather than shrunk.

## Details that matter

- **Deep links.** `#/b/<board>` and `#/b/<board>/n/<note>` — the URL is where you are, so
  a copied link opens straight to that note, cold.
- **Content leads, chrome recedes.** White cards on a quiet grey, soft shadows instead
  of borders, and a translucent bar that blurs what is behind it. No coloured slabs — the
  list is the thing you came for.
- **Type carries the hierarchy.** A 32px large title, 17px card titles, 13px meta in
  grey. Weight and size do the work that colour used to.
- **Four things on a card, no more.** What it is, how much, one tap to tick it off, and a
  picture. The category chip and the quantity badge both went: the chip repeated what the
  filter already knows, and the badge was a black disc sitting on top of the illustration.
- **Quantity is text, and only when it matters.** The size line is the control — tap
  `250ml` and a stepper takes its place. `×3` shows; `×1` does not, because it says
  nothing.
- **Colour only where it carries meaning.** Notes keep their paper colour, because a
  note is a physical thing you recognise by its sheet. Boards carry no colour at all —
  a dot beside a name told you nothing you could act on.
- **Ink for anything you press.** One near-black for every affirmative action, so
  "a surface" and "do something" never look alike.
- **Motion with a little bounce.** Presses settle on a spring curve and a checked item
  pops once — the only decoration in the system, and it is disabled under
  `prefers-reduced-motion`.
- **On a phone.** Below 480px the drawn device frame drops away and the app fills the
  screen — no phone inside a phone.
- **Keyboard.** Escape unwinds one layer at a time: menu, then sheet, then search, then
  back a screen.
- **Motion.** Tailwind keyframes, all disabled under `prefers-reduced-motion`.
- **Labels.** Controls carry names and pressed state for screen readers.
- **Type.** Nothing below 11px, body copy at 15–16px, and every text input at 16px —
  under that, iOS Safari zooms the page when a field takes focus.
- **Touch.** Every control clears Apple's 44pt minimum. Where the design wants a small
  mark — the check ring, the quantity badge — the painted circle stays small and the
  `.hit` utility extends the touchable area past it.

## Shape of the code

| File | What's in it |
| --- | --- |
| `src/types.ts` | Piece unions (`item` / `note` / `voice`), members and invite parsing, note palette, sort modes |
| `src/seed.ts` | The three seeded boards and keyword → illustration/aisle matching |
| `src/parse.ts` | Turns "2 rose lemonade 250ml" into an item |
| `src/store.tsx` | One context: boards, mutations, undo, toasts, persistence |
| `src/audio.ts` | Mic recording, IndexedDB clips, speech playback, one-at-a-time playback bus |
| `src/hooks.ts` | Escape stack, press-and-hold, hash routing |
| `src/components/ProductArt.tsx` | Drawn product illustrations, so the grid keeps one voice whatever the user types |
| `src/components/Chrome.tsx` | Device frame, status bar, avatars |

## A taxonomy that was wrong

Items used to be filed under Groceries / Drinks / Household Items / Party Supplies,
inherited from the original mockup. That set does not hold up: drinks *are* groceries, so
an item had two right answers while the filter demanded one; and "party supplies" is an
occasion, which belongs to the board, not the thing on it.

Aisles replaced it. They are mutually exclusive, they are assigned from the item's name
by the same vocabulary that picks its illustration, and they do visible work — they order
the board for the walk round the shop instead of powering a filter nobody needed. Boards
saved under the old labels are migrated on load, re-derived from the item's name where
possible, so "Milk" lands in Dairy & eggs rather than the catch-all it came from.

## Not built

Sync is whole-board, last write wins — two people editing the same second, the later
wins. Recorded audio is real but local to the browser
that recorded it, and the seeded clips are your own spoken transcripts rather than
recordings of other people.
