# Progress

A working log for QuestionSpace — decisions, visual rounds, measurements, and what is
still open. Newest state first.

**Status:** v2 loop complete, first-person observation window shipped, chart table, a11y and
contrast passes complete, GitHub Pages deploy configured. `npm run check` and `npm run build`
pass.

---

## 17 Nov 2026 — the observation window

### What changed

The atlas was still a top-down map: a lovely one, but a map. The brief was a game-style left
panel, first person, travelling between planets. This round replaced the atlas with a
**window** and demoted the map to a **nav chart taped to the dash**.

**The window**

- A hand-drawn brass frame with four rivets, a scratched-glass glare, and a brass nameplate:
  region, world name, survey tag, and position in the run.
- One world at a time, drawn large: the same twelve hand-tuned looks (bands, craters, ice
  cracks, hazies, metallic sheen, galaxy arms, lensed cluster, deep field) with an added
  atmosphere glow, a directional terminator, a proper front/back ring split, and orbiting
  moons scaled to the window.
- **Travel is staged.** On arrival the new world rises from 58% scale with a slight upward
  drift. On departure the old world grows past the glass and fades while dashes streak
  across the pane. Both are short (≈1 s) and happen at question boundaries, so the loop
  stays instant.
- **Junctions are a place, not a dialog.** The window shows the calm world on the left and
  the storm world on the right, named, with two dashed routes bending in from the ship.
- **Meridian Station** opens and closes the run: a docked establishing shot with the first
  destination hanging nearby, and a warm return shot at the debrief.
- A coral **signal lamp** appears in the glass when a signal is due and tracks it in one
  tap; a coral dashed ring orbits the world while it is being re-surveyed.

**The nav chart**

- A strip of paper with two tape tabs, pinned under the window. Four region columns, three
  worlds each, with region counts. Every world is a real button with its planet glyph,
  name, and survey tag.
- State still reads without colour: muted glyph + dashed halo (uncharted), mint check
  (charted), amber star (mastered), coral dotted ring + badge (signal), amber dashes plus
  `you are here` (current).
- The world card is unchanged in spirit and now sits over the chart, like a note laid on
  the table.

**Implementation notes**

- `StarMap.tsx` is now one window scene plus a chart; the old 1000×1000 atlas SVG,
  constellation lines, ship flight arcs, and `lib/geometry.ts` are gone.
- `Flight` is now just a departure key. `App.tsx` no longer computes map arcs.
- Arrival/departure use CSS transforms on a wrapper group so the SVG `translate` stays
  intact; chart glyphs reuse the same `WorldArt` renderer at `r = 13`.
- Mobile switches the chart to a 2×2 region grid so names stop truncating, and keeps the
  window above it.

### Verification

| Check | Result |
| --- | --- |
| `npm run check` | Typecheck + 25 tests + 36 contrast pairs pass |
| `npm run build` | Succeeds |
| Window at 1440×900 | Planet fills the pane; plate and lamp legible |
| Window at 393×852 | planet crops deliberately; chart names readable in 2×2 |
| Arrival / departure | warp dashes + scale/FX, suppressed by reduced motion |
| Junction | VESTA / PSYCHE shown with lane labels and route arcs |
| Detour | lamp → anomaly ring on KEPLER-16 b → plate says “signal detour” |
| Debrief | station return shot; chart fully inked or ringed |

---

## Previous round — the illustrated atlas (superseded)

### What changed

The right-hand console was already hand-drawn paper; the left side was still a technical
star chart with crosshairs, mono score boxes, region pips, and a survey-file table. It read
as instrumentation, not as a place. This round replaced it wholesale.

**New atlas**

- Twelve **drawn worlds** instead of abstract nodes: a ringed gas giant, an ocean world,
  red/grey rock worlds, a metallic asteroid, two ice moons, a hazy moon, a spiral galaxy, a
  lensed cluster, and a deep field. Each has its own palette, surface pattern, optional
  ring, and moons.
- Four **constellations** with handwritten names and a faint triangle that inks itself in
  as worlds are known. Region subtitles are sentence-case and count `n/3 charted`.
- Status is visible before reading: muted silhouette + dashed halo (uncharted), mint check
  sticker (charted), amber star sticker (mastered), coral signal rings (missed), dashed
  amber orbit + glow + ship (current).
- Removed the survey-file table. A tap opens a warm **world card**: region and topic,
  status, a sentence about the world, how soon the signal returns, and a Track action when
  it is due.
- Meridian Station is now a small illustrated dock; a comet drifts through the empty
  quarter; broad pencil orbits replace the technical grid and frame ticks.

**Supporting changes**

- Header tally is handwritten (`3 charted · 1 signal`), not three bordered score boxes.
- Footer legend uses hand-drawn pills and a dashed halo for uncharted.
- The atlas is now a `section.atlas` with its own CSS system; old `.chart`, `.node`,
  `.score`, `.region-pip`, and `.node-file` styles were removed.
- Active planet gets a soft amber glow and a larger label; ship scale raised from 0.72 to
  0.96 so it reads at a glance.
- Mobile hides only the tiny taglines; planet names, region names, and counts stay legible
  at 393 px. The atlas grows to `min(62vh, 480px)` to give the planets room.

### Repository and deploy

- Replaced the old Papyrus Next.js project on `github.com/Abhinav-Prabhakar/Papyrus` with
  this app in a new commit, preserving history.
- Renamed the repository to **QuestionSpace**.
- Vite production base is `/QuestionSpace/`; dev stays at `/`.
- Added `.github/workflows/deploy.yml` (check → build → Pages) and switched Pages source to
  GitHub Actions.
- Live URL: <https://abhinav-prabhakar.github.io/QuestionSpace/>.

### Verification

| Check | Result |
| --- | --- |
| `npm run check` | Typecheck + 25 tests + 36 contrast pairs pass |
| `npm run build` | Succeeds; ~306 kB JS, ~49 kB CSS (93.6 kB / 10.2 kB gzip) |
| Atlas at 1440×900 | 12 worlds, 4 constellations, no label collisions |
| Atlas at 393×852 | all 12 worlds visible, names readable |
| Question state | fits 900 px viewport; actions above the fold |
| Detour flow | miss → due at cursor 3 → T → answer → returns to world 05, signal cleared |
| Reduced motion | ship jump-cut, blooms/trails suppressed, 80 ms landing |

---

## v2 mechanics — what shipped

- **Fuel is optionality, not health.** Start 5, cap 8. Scan −1 (hint + two eliminated
  choices), skip −2 (world becomes a signal), retry −1 (reopen a missed sample). Every
  third world charted salvages +1.
- **Signals (anomalies).** A miss or skip stores `dueAt = cursor + 3 + (returns − 1) × 2`.
  Due signals can be opened as a detour with `T` and return you to the same route spot, or
  revisited in a new pass from the debrief.
- **Crew one-shots.** Pip (free skip), Bolt (+2 fuel), Dr. Vela (free scan), Moss (free
  retry). Start with Pip + Bolt; junctions recruit Vela or Moss; duplicates convert to +1
  fuel.
- **Junctions at cursors 4 and 8.** Quiet lane = lowest-difficulty remaining world, +1 fuel
  and Vela. Storm lane = hardest, +2 fuel and Moss. Reward only on a clean pass.
- **Captain's log** generated from state (`src/lib/log.ts`), `navigator.share` where
  available, clipboard fallback.
- **Sound** synthesised with Web Audio (ambient pad, sparse radio chatter, feedback pings),
  started on a gesture, toggle persisted.

---

## Decisions and trade-offs

- **A map of places beats a progress bar.** The constellation is the diagnostic: you can
  see which region is dim at a glance. The cost is that 12 authored coordinates will not
  scale to hundreds of worlds without clustering.
- **Illustration over instrumentation.** Removing exact attempts/difficulty/returns from
  the world card loses some detail. It gains a card a person would actually read. Difficulty
  still appears in the junction preview, where the choice depends on it.
- **Uncharted worlds remain visible.** A map of silhouettes would be prettier in the first
  second but would hide the variety that makes the atlas inviting. They are muted, not
  hidden.
- **Animation only at the boundaries.** Launch/touchdown and the ship arc are the only
  sustained motions; the question itself never animates between reading and answering.
- **Pure reducer, ephemeral motion.** `session.ts` is testable without React; flight,
  landing, focus signals, and audio live in `App.tsx` and are never persisted.
- **No animation or state library.** CSS/SVG keyframes and a reducer cover everything, and
  reduced-motion handling stays trivial.
- **Self-hosted fonts and inline SVG.** No runtime CDN, no image requests for the atlas.

---

## Test coverage

`src/lib/session.test.ts` — 25 tests:

- initial state, begin, reset;
- per-pass answer gating and attempts;
- mastered vs charted vs anomaly status;
- salvage cadence and cap;
- scan cost, elimination, no double scans, no scans after answering;
- skip cost and signal creation;
- paid retry, blocked unpaid retry, recovery;
- anomaly rescheduling on return;
- junction detection, route selection, reward on clean pass;
- recruit once, duplicate conversion;
- all four crew one-shots;
- revisit pass and signal clearing;
- detour in/out with cursor restore;
- progress summary and captain's log.

`scripts/check-contrast.mjs` audits 36 pairs across the paper console, the dark atlas,
sticker buttons, alpha-composited stamps, and focus/control edges.

Not covered yet: component tests, keyboard interaction tests, persistence validation,
and screenshot regression.

---

## Open questions

- The window is a single static planet. A slow terminator drift, a creeping cloud band, or a
  tiny moon orbit would make it feel alive; all are currently suppressed to keep renders
  deterministic and calm.
- The junction shows both worlds, but the lane colours (mint/coral) only appear as thin route
  lines. The console carries the real choice; the window is atmosphere.
- The nav chart is four fixed columns. At 12 worlds it works; at 40 it would need scrolling,
  folding, or a second sheet.
- The world card covers half the chart on mobile. A bottom sheet or an inline expansion
  under the tapped world would keep the map visible.
- Warp dashes are randomised by index, not by direction of travel. A real directional streak
  field would sell the turn better.

---

## Next steps

1. **Component + keyboard smoke tests** (Playwright): full run, revisit, detour, keyboard
   only, reduced motion, 393 px.
2. **Deterministic choice shuffle** per session, with a test that the correct id resolves.
3. **Authoring format** outside TS (JSON/MDX) with validation for questions and planet
   looks.
4. **Cross-session spaced return** — keep signals due across sessions and show “last seen”
   age on the world card.
5. **Second sheet** — expedition selector using the existing `Expedition` shape.
6. **Perf pass** as world count grows; today it is one large inline SVG and twelve small
   chart glyphs.
