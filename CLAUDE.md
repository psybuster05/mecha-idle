# Mecha Idle

A Melvor Idle-style skill-based idle game. Post-apocalyptic setting. **You are a sentient
mech** that reactivated alone in the ruins - skills are not things you learn, they are
subroutines you *recover*. Every part you install is literally your own body.

Target: web now, desktop wrap (Electron/Tauri) for a possible Steam release later.

## Architecture rules (these are load-bearing - do not violate)

1. **`src/sim/` and `src/content/` are pure TypeScript.** No DOM, no `window`, no
   `localStorage`, no React, no imports from `src/ui/`. Enforced by eslint.
   The sim is `tick(state, deltaSeconds) -> state`. This is what makes offline progress
   and unit tests possible at all.

2. **Never touch `localStorage` directly.** Go through `SaveAdapter`
   (`src/platform/SaveAdapter.ts`). Web uses localStorage; a desktop build swaps in a
   filesystem adapter; Steam Cloud after that. Only that one file should change.

3. **No network dependencies, ever.** No CDN scripts, no Google Fonts, no remote assets.
   A Steam build must run fully offline. Bundle everything locally.

4. **Saves are versioned with migrations.** Every save carries `version`. When the shape
   changes, add a migration - never silently break an existing save.

5. **Actors, not a global current action.** State is
   `actors: { mech: {...}, crawler: {...} }`, each with its own `currentAction`.
   v1 enforces "one action at a time" as a *rule*, not as a hardcoded shape, so the
   crawler (a mobile base you dock into, which works while the mech fights) can be
   unlocked later as data rather than a rewrite.

6. **React never drives the simulation clock.** The sim ticks in a `requestAnimationFrame`
   loop; React re-renders from a snapshot on a throttled interval (~10/sec).

## Content is data, not code

Balance lives in `src/content/` as typed tables. Every non-combat skill runs on the *same*
engine (`src/sim/skillEngine.ts`): an action is
`{ duration, inputs, outputs, xp, levelRequired }`. Adding a skill should mean adding a data
file, not writing engine code. "Make tier 3 parts stronger" should be a number edit.

## Pixel art rules

- Base sprite sizes: **32x32** items/icons, **64x64** mechs and enemies.
- `image-rendering: pixelated` and **integer scale factors only** (2x, 3x, 4x). Never
  fractional - it turns pixel art to mush.
- Every asset must be logged in `ASSETS.md` with source, author, and license *before* it is
  committed. A Steam release requires provable provenance.

## Commands

- `npm run dev` - dev server
- `npm test` - vitest (sim unit tests)
- `npm run typecheck` - tsc
- `npm run lint` - eslint (also enforces the sim purity boundary)

## Design intent

The living design lives in `docs/GDD.md`. Items tagged BUILT are true in code; PROPOSED
is a suggestion; OPEN is waiting on the user. Check it before inventing new mechanics,
and when a question there gets answered, update the tag rather than leaving it stale.

## Naming: standard RPG terms, not mecha jargon

Anything the player reads as a *label* uses the vocabulary idle-game players already
know: **HP, Attack, Strength, Defence, Hitpoints, Damage, Accuracy, Armour, Evasion,
Attack Speed, Bank, Equipment**. Panels are Skills / Combat / Equipment / Bank.

The setting lives in flavour text, item names and enemy names - never in the words a
player has to decode to read a stat. An earlier pass used Integrity / Targeting / Servos
/ Plating / Structure / Sorties / Chassis / Hold, and it meant learning a glossary before
you could tell whether a number was good.

Skill ids are in save files, so renaming one is a migration (see `MIGRATIONS` in
`src/sim/save.ts` for the v1 -> v2 example), not a find-and-replace.

## The world is a graph, not a tilemap

You never steer the mech - you pick a destination and it walks. So `src/content/world.ts`
holds nodes (places with coordinates) and edges (walks with a length), and that is all
the spatial model there is. No tiles, no collision, no navmesh, no physics.

**Travel is simulated, not animated.** `src/sim/world.ts` owns pathfinding (Dijkstra,
because edges carry a difficulty multiplier so fewest-hops is not cheapest) and advances
the walk inside `tick`. The canvas sprite only ever *reads* `actorPosition`. That is what
keeps offline catch-up honest: eight hours away credits the walk and then the work.

`advanceTravel` returns leftover seconds so one large step both travels and then works.
Without that, a single offline step would arrive and stand still until the next tick.

Actions and combat zones live at nodes. Starting one routes you to the nearest place
that offers it; the activity is the *intent* until you arrive.

Rendering runs its own animation-frame loop off `game.live` (the mutable state ref) so
the sprite moves at full frame rate, while React panels stay on the throttled snapshot.

## Gating: combat widens, it never unblocks

**Time alone must be able to max any non-combat skill.** Every Scavenging, Refining and
Fabrication action reaches level 99 without a single fight. This is the Melvor contract
and it is load-bearing: idle players are buying predictable progress, and in a game that
allows one action at a time, a boss you cannot beat would stop *everything*.

Bosses unlock **breadth, not height** — new regions, unique materials for the best gear,
story beats, and permanent perks. A player who never fights still has a complete idle
game; they just cannot reach the best equipment, see the whole world, or finish the story.

Practical rules:
- `WorldNodeDef.unlockedBy` gates a place behind a boss. Locked regions **may** hold
  gathering content; what they may never be is *required*. A complete 1-99 ladder must
  remain available outside every lock, and a locked action must never beat what is
  already open at its level. Both are measured - not assumed - by recomputing the whole
  1-99 curve from unlocked actions only.
- Later zones give *different* gathering at comparable rates, not strictly better. Making
  them better re-gates the ladder through the back door, since the fastest route to 99
  would end up behind a boss. Ship Graveyard actions deliberately sit at the *same*
  levels and rates as their Rustbelt counterparts; only the outputs differ.
- Each region should retire the previous one's easy answer. EMP wins the Rustbelt; the
  Ship Graveyard is sealed against it. That is what stops one weapon solving the game.
- Every skill action must be listed on some world node. An action with nowhere to be
  performed halts instantly as `unreachable` - also enforced by a test, which is how nine
  stranded recipes were found.

## Defeated bosses

`state.defeated` maps boss id to kill count. The count rather than a flag, because it
distinguishes the *first* kill - what story beats and one-off rewards key off - from
repeat farming, at no extra cost. Only bosses are recorded; logging every trash kill
would grow without bound and serve nothing.

It is the first persistent progress that is neither a level nor an item. Region unlocks
(`WorldNodeDef.unlockedBy`), perks, story and eventually NG+ all read from it.

**Perks must not break the offline guarantee.** Two rules learned the hard way:

- Yield bonuses are a **chance of a bonus haul rolled per completion**, never a
  multiplier on the total. `floor(qty × 100 × 1.08)` and `floor(qty × 1.08) × 100` are
  different numbers, so a multiplier would silently make one big step disagree with many
  small ones.
- Perked xp is left **unrounded** for the same reason. Rounding per step and rounding
  once diverge.

A perk is recorded *before* the kill's own xp is awarded, so the fight that earns a perk
is not itself boosted by it. That keeps the first kill reproducible.

## Weapon archetypes

Weapon damage is a **multiplier** (`damageMultiplier`), never a flat bonus. Flat weapon
damage is swamped by level scaling - +34 is +45% at level 60 and +28% at 99 - while
`attackSpeed` is a share of a fixed 3s base and never decays. Flat bonuses made cadence
the only weapon stat that mattered and turned slow weapons into traps.

Archetypes, all measured rather than assumed:

- **Fast** (Arc Repeater): low multiplier, big `attackSpeed`, high accuracy. Best on
  large single targets, where every point of damage lands somewhere.
- **Slow and heavy** (Harpoon Launcher): high multiplier, negative `attackSpeed`,
  `cleave: 1`. Best on small enemies, because overkill carries instead of evaporating.
- **Balanced** (Pulse, Arc): middling everything; chosen for their damage *type*.

Cleave self-balances - the advantage shrinks as target HP grows - so it needs no cap
beyond the two rules in the code: a carried kill still costs the respawn delay, and
banked overkill is spent immediately so it cannot be stockpiled.

When adding a weapon, measure it against the existing ones before shipping. Both traps
found so far looked entirely reasonable in the content table.

## Story

Delivered as recovered memory: first person, fragmentary, out of order. Content lives in
`src/content/story.ts`; evaluation in `src/sim/story.ts`, called from `tick`.

Two rules, both load-bearing:

- **Story reads from the world; the world never reads from story.** No beat may gate a
  region, item or level. Skipping every word must leave the game fully playable - the
  same no-gating rule as combat, from the other side.
- **Triggers must be monotonic.** Once true, true forever. `tick` evaluates them once per
  step, so a condition that can flip back could be missed entirely by one large offline
  step while many small ones caught it. Bosses defeated, places visited and levels
  reached qualify; "currently holding an item" does not, which is why there is no item
  trigger. Visits are recorded on arrival into `state.visited` for exactly this reason.

Interrupts are rationed to the waking, each boss and the ending - under ten in the whole
game. A test enforces that nothing minor interrupts.

## When the browser disagrees with the tests

Vite caches transformed modules in `node_modules/.vite`, and that cache **survives a dev
server restart**. If behaviour in the browser contradicts a passing test, run the exact
state through the real code in a scratch test first; if Node is right and the browser is
wrong, delete `node_modules/.vite` and restart. This has now cost time twice.

## Boss budgets

Player DPS tops out near 25 and max HP near 1,100. **A boss is bounded by how long the
player can stand in front of it, not by how much HP it has.** Inflating boss HP does not
make a fight harder, it makes it longer, and length is what kills.

Two consequences, both learned by shipping the mistake:

- **Damage floors must sit below reachable DPS.** The Census first shipped regenerating
  120 HP/s against about 30 achievable - not a wall, a brick nobody could pass. Anything
  using `regenPerSecond` needs measuring against real output first.
- **Long fights need `PHASE_TRANSITION_HEAL`.** Regeneration alone is 0.4%/s, so a
  400-second boss could only ever deal ~2.6 net DPS. Healing 35% of max HP at each phase
  threshold turns one long fight into several short ones, which is the shape the budget
  supports.

Measure every boss before shipping it. Use **time to first kill**, never kills-per-hour -
the latter measures death-and-recovery cycles rather than damage, and hides the design.

## Art

Sprites live in `src/content/sprites.ts` as **pixel data, not image files**: rows of
characters indexed into a palette, space meaning transparent. Rendered by
`PixelSprite` (React) and by `WorldMap`'s canvas, both at **integer scale with
smoothing off** - a fractional scale turns pixel art to mush.

Why data rather than PNGs: it diffs, it costs nothing to load, it carries no licence,
and **replacing this art with a commissioned set means replacing the data, not the
renderer**.

Rules:
- Authored at **16x16**. A test asserts every sprite is rectangular, 16x16, uses only
  characters its palette defines, and is not blank.
- **Colour is meaning.** Blue is yours, orange is hostile, cyan is a live readout. A
  player should tell friend from enemy without reading a word.
- Enemies use **archetype sprites** (skitter / flyer / bulwark / authority), not one per
  enemy. Twenty enemies is more art than this project can carry, and at this size the
  silhouette is what reads anyway. Bosses always get `authority`.
- The mech is **layered** - base plus whatever is fitted - because "every part you install
  is literally your own body" is the one visual idea the fiction demands.

The map draws only what you can reach plus its immediate frontier. Drawing all
twenty-four places at once was unreadable overlapping labels.

## The crawler

The second actor, unlocked by wiring in a Traction Core. `maxConcurrentActivities` goes
from 1 to 2 at that moment - the rule has always been a function over `actors` rather
than a hardcoded shape, which is why unlocking it needed no restructuring.

Rules that keep the two actors distinct:

- **Industry only** (`CRAWLER_SKILLS`). You gather and fight; it refines, fabricates and
  salvages. They never compete for the same job.
- **It never travels to work.** It carries the workshop, so `startSkillAction` skips
  routing entirely for the crawler.
- **New orders do not cancel a drive.** `setActivity` clears travel, which is right for
  the mech - its activity is what decides where it goes - and wrong for the crawler,
  which works anywhere. The intent restores the kept travel.
- **It drives slowly and ignores waypoints.** Waypoints are your surveying, not its.
  `moveSpeedOf` returns a fixed `CRAWLER_MOVE_SPEED` for it.
