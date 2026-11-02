# Nook demo reel — voice-over script

Video: `nook-demo-reel-4k.mp4` (upload this one — YouTube gives 4K uploads a much
higher bitrate, so it looks sharper even for people watching in 1080p) and
`nook-demo-reel-1080p.mp4` for anywhere else. 30 fps, 1:58, no audio.

Each line is written to fit the time on screen at a relaxed pace (about 2.5
words a second). Title cards are deliberately quiet beats: start the next line
as the card appears, or let it breathe.

| Time | On screen | Say |
| --- | --- | --- |
| 0:00 | **Nook** title | “This is Nook — the shopping list the whole house can see.” |
| 0:03 | Card: *Make a board* | “Everything starts with a board…” |
| 0:06 | Tapping “Weekly shop” | “…one for each shop, trip or plan. Tap a name and you’re in.” |
| 0:10 | Card: *Type it like you’d text it* | “Adding things is just typing.” |
| 0:13 | “6 eggs”, “oat milk 1l”, “2 lemons”, “sourdough”, “coffee 250g” | “Six eggs. Oat milk, a litre. Two lemons. Nook pulls out how many and how big, finds a picture, and files each one under the right aisle — you just keep typing.” |
| 0:32 | Card: *Notes and voice memos* | “Some things don’t fit on a list.” |
| 0:34 | A sticky note, then a voice memo | “Stick a note on the board for everyone — ‘get the ripe avocados, not the rock-hard ones.’ Or skip the typing: hold the mic and just say it. Everyone on the board can read it and play it back.” |
| 1:02 | Card: *Sorted by aisle* | “And in the shop…” |
| 1:05 | View → By aisle | “…switch to By aisle, and the list lines up the way you walk round.” |
| 1:13 | Card: *Tick it off* | “Then tick things off.” |
| 1:16 | Ticking each item, confetti | “Tap the circle as it goes in the basket. Clear the whole list and Nook throws you a little party.” |
| 1:29 | Card: *Share it with a link* | “The best part is sharing.” |
| 1:31 | Share sheet, “Mum joined”, ticking together | “Send the board as a link. Whoever opens it signs up and they’re on it — and everything stays in sync while you shop. Mum ticks off the milk at home, you see it in the aisle.” |
| 1:47 | The Nook website | “Nook is free, works in any browser, and there’s nothing to install.” |
| 1:53 | Card: *Start a board — free* | “Start a board at nook-navy-mu dot vercel dot app.” |

## Recording tips

- Record the voice in one take while the video plays, then nudge in the editor —
  the title cards give you natural places to cut.
- If you run long anywhere, the typing (0:13) and notes (0:34) scenes are the
  easiest to trim from.
- For YouTube, add a little background music at around −22 dB under the voice.

## Re-making the reel after app changes

The tools in `source/` drive the real app and rebuild the video:

```bash
cd ~/nook/reel/source
npm i playwright@1            # once; uses the Chrome already on this Mac
# in another terminal: run Nook without accounts on port 5174
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm --prefix ~/nook run dev -- --port 5174
node record.js && node titles.js && python3 build.py
```

`record.js` plays each scene (fresh board, typing, note + voice memo, aisle sort,
ticking, the website's sharing demo) at 4K and saves the frames; `titles.js`
draws the title cards in Nook’s fonts; `build.py` cuts it together with ffmpeg.

Why it runs slowly: at 4K the browser can only hand over ~12 frames a second, so
`record.js` slows the page's clock and animations 3× while recording and
`build.py` speeds the footage back up — smooth 30 fps at full sharpness.
