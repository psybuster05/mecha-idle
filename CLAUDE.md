# Mecha Idle

A Melvor Idle-style skill-based idle game. Post-apocalyptic setting. **You are a sentient
mech** that reactivated alone in the ruins - skills are not things you learn, they are
subroutines you *recover*. Every part you install is literally your own body.

**Target: a playable proof of concept on the web.** Published as a static site at
https://psybuster05.github.io/mecha-idle/ so people can be shown it and poke at it.

Steam was the goal and no longer is. This exists to prove the systems and to find out
what is actually fun, before a second game that its author writes and designs the
majority of. Read that as licence to keep the scope where it is: this does not need
achievements, a store page, or a desktop wrap. It needs to be good enough to hand to
someone.

The architecture rules below were written for a Steam release. They survive the change
because none of them were really about Steam - see each one's *why*, which has been
brought up to date.

## Architecture rules (these are load-bearing - do not violate)

1. **`src/sim/` and `src/content/` are pure TypeScript.** No DOM, no `window`, no
   `localStorage`, no React, no imports from `src/ui/`. Enforced by eslint.
   The sim is `tick(state, deltaSeconds) -> state`. This is what makes offline progress
   and unit tests possible at all.

2. **Never touch `localStorage` directly.** Go through `SaveAdapter`
   (`src/platform/SaveAdapter.ts`). One file knows where a save lives, which is what
   makes "somewhere other than this browser" a one-line change rather than a hunt. The
   key is namespaced (`mecha-idle/save`) because every GitHub Pages project site shares
   one origin, and so shares one localStorage.

3. **No network dependencies, ever.** No CDN scripts, no Google Fonts, no remote assets.
   Bundle everything locally. A page that fetches from a third party is a page that
   breaks later for reasons no one will be around to fix - and this one is meant to
   still work when someone opens the link in a year.

   Related: `base: './'` in `vite.config.ts` emits relative asset paths, which is what
   lets the same build work from a subpath (`/mecha-idle/`) rather than only at a
   domain root. Do not change it to `/`.

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
  committed. Less urgent now that nothing is being sold, but reconstructing provenance
  later from memory is miserable, and the current art dodges the problem entirely by
  being data rather than files.

## Commands

- `npm run dev` - dev server
- `npm test` - vitest (sim unit tests)
- `npm run typecheck` - tsc
- `npm run lint` - eslint (also enforces the sim purity boundary)

## Design intent

The living design lives in `docs/GDD.md`, which is **deliberately untracked** - it is a
working document that quotes conversations verbatim, and it stayed private when the repo
went public. It is on disk; it is not in the repo, and it must not be committed back.

Items tagged BUILT are true in code; PROPOSED is a suggestion; OPEN is waiting on the
user. Check it before inventing new mechanics, and when a question there gets answered,
update the tag rather than leaving it stale.

## Naming: standard RPG terms, not mecha jargon

Anything the player reads as a *label* uses the vocabulary idle-game players already
know: **HP, Attack, Strength, Defence, Hitpoints, Damage, Accuracy, Armour, Evasion,
Attack Speed, Bank, Equipment**.

The rail is grouped **Combat / Non-combat / Character**, with Combat first. Combat is the
part of this game with the most in it - six regions, seven bosses, four skills of its own
- and listing it last among the gathering skills said the opposite. Its own entry is
called **Fight** rather than Combat, because a section and its first child sharing a name
reads as a mistake.

## Melee and Ranged

Weapons declare a `combatClass`. **Ranged is one skill doing the work of two** - it
supplies both the accuracy Attack would give and the damage Strength would give - while
melee keeps them separate. That is the actual difference between the branches, not a
numbers tweak. Absent means melee, so a weapon added carelessly lands in the branch that
cannot silently borrow Ranged levels; `'any'` follows whichever branch you trained higher.

**Combat level takes your best branch, never the average of all.** Averaging a fifth
skill in was measured to drop existing saves by 7-19 levels and would have shut zones
people had already opened. Offence is `max(melee average, ranged)`, weighted double to
stand in for the two skills it replaces - which makes the formula a strict generalisation
of the old one, identical while Ranged trails. A test asserts that across five save
shapes.

Two traps this created, both fixed:

- **Every fabrication tier that makes a weapon must make one each branch can use**, or a
  branch is stranded. Melee briefly had nothing between fabrication 30 and 75. A test
  guards it now, the same way one guards actions having somewhere to be performed.
- **Existing saves needed seeding.** Most weapons are ranged, so a v4 save would have
  loaded with a launcher fitted and Ranged at level 1. The 4 -> 5 migration starts Ranged
  at the better of Attack or Strength.

**Attack styles decide which skill a fight trains, and every style pays the same total
xp.** That constraint is load-bearing rather than cosmetic: before styles existed a kill
paid the *full* xp to Attack, Strength and Defence at once, so routing that to one skill
would have cut combat training to a third and silently re-gated every zone, since zone
requirements read combat level. A focused style therefore hands one skill what its branch's set
would have shared, and Balanced is the old behaviour kept as the default. The sets are
different sizes - melee routes between three skills, ranged between two - so it is the
total that is held constant, never the per-skill amount.

Specialising still costs something, and should: combat level is the average of four
skills and the xp curve is exponential, so concentrated xp buys fewer total levels than
spread xp. One number climbs fast, combat level climbs slower. Hitpoints sits outside the
choice entirely - everything hitting you trains it.

Two things measured rather than assumed there. The same *kill* pays an identical total
under every style, asserted exactly. Over a long *fight* the totals drift under one
percent apart, because a style that raises accuracy or damage kills marginally faster -
earned by fighting better, not by being paid more.

The four combat skills each get a page (`CombatSkillPanel`). They had levels and xp from
the first commit and were shown *nowhere*: you could train Attack for hours and never
learn it had a level. What a level buys is data in `content/skills/combat.ts`, and a test
measures those coefficients against `derivedStats` - two copies of a number drift, and a
tooltip that lies is worse than no tooltip.

The setting lives in flavour text, item names and enemy names - never in the words a
player has to decode to read a stat. An earlier pass used Integrity / Targeting / Servos
/ Plating / Structure / Sorties / Chassis / Hold, and it meant learning a glossary before
you could tell whether a number was good.

Skill ids are in save files, so renaming one is a migration (see `MIGRATIONS` in
`src/sim/save.ts` for the v1 -> v2 example), not a find-and-replace.

## The world is a graph, and getting anywhere is free

`src/content/world.ts` holds nodes (places with coordinates) and edges (which places
touch which), and that is all the spatial model there is. No tiles, no collision, no
navmesh, no physics.

**Travel was built and then deleted.** There was pathfinding, per-actor movement speed,
waypoints, and a sprite that walked the map inside `tick`. It went because you almost
never have the map open, so the walk was a cost you paid without seeing anything for it.
This is a menu game. Do not rebuild it without a reason that survives that sentence.

What survived is the part that was never about distance:

- **Places gate content.** A node with `unlockedBy` is shut until that boss falls. This
  is what all seven bosses feed, and it is the whole reason nodes still exist.
- **Actions and combat zones live at nodes.** `startSkillAction` puts you at one that
  offers the job (`moveToAny`), instantly. If every such place is sealed the activity
  halts as `unreachable` rather than looking active and producing nothing.
- **The map draws the graph.** Edges are what make the frontier legible, so a node with
  no edges would be invisible. `visibleNodes` in `content/world.ts` decides what is
  drawn: everywhere open, plus the locked places one step beyond it.

Nothing on the map moves between player decisions, so `WorldMap` redraws from the
throttled React snapshot. It has no animation-frame loop of its own any more.

**The World tab was deleted too.** Once travel was gone it was a map plus two lists, and
both lists were dead weight: its action list duplicated the skill panels with less
information, and its "go here" buttons changed nothing the simulation reads - `at` is
read only by `moveToAny`'s already-here check and by where the crawler wakes up.

The one thing that could have made location matter was checked rather than assumed: nine
story beats trigger on visiting a place, and all nine are reached by starting actions
normally. A test asserts it (`story is not missable by playing normally`), because that
is the mirror of the story rule - skipping every word must leave the game playable, and
playing normally must not skip the story.

What the tab did have was the only picture in the game, so the picture became `Stage` -
a column that is always on screen. See the art section.

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

**Enemies do not regenerate, and must not.** Two boss phases used to heal, and the whole
idea is deleted. It was tuned twice and was wrong both times, for two different reasons:

- Set too high it is not a wall, it is a brick. The Census first shipped regenerating
  120 HP/s against about 30 achievable DPS - unpassable at any level, and from the
  player's side indistinguishable from a bug. You fight for ten minutes and the bar goes
  *up*.
- Set low enough to be fair it stops mattering. The Colonel's was 0.025%/s; removing it
  moved his time-to-kill by three seconds in three hundred. It was paying nothing for the
  confusion it caused.

Between those two failure modes there is a band, but it is narrow and it buys a mechanic
whose only expression is "you are not allowed to win yet". A damage check is better spent
on armour, resistances or evasion, which say *what to bring* rather than *how much*.

One measured surprise worth keeping in mind, because it is counterintuitive: removing
boss healing made one low-DPS build **worse**. The fight got shorter, so the player's own
0.4%/s regeneration had less time to accumulate, and the build reached the lethal final
phase with less health banked. Shorter is not automatically easier.

The other consequence, still true:

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
- **Icons follow the same archetype rule.** One per skill, not one per action; one per
  item *category*, not one per item. Seventy items and eighty-odd actions is more art
  than this project can carry, and at 16x16 the silhouette is what reads anyway - a
  category still tells a player the thing they actually want to know, which is whether
  this is raw stock, a finished part, or something they burn.
- **Damage type icons reuse the weapon-overlay colours** (steel, cyan, violet) rather
  than picking fresh ones, so the weapon drawn on your portrait and the type tag beside
  it agree. They also avoid each other's metaphors: kinetic is a solid wedge and Ranged
  a bolt *with a trail*, because two projectiles would have been one icon twice.
- **Two icons must not need colour to tell them apart.** Cartography shipped as a compass
  rose that collapsed into the same cross as Hitpoints at 16px; only the green said which
  was which, which is exactly the failure the colour rule above is meant to prevent. It is
  a survey grid now. Look at every icon next to its neighbours before believing it works.
- Enemies use **archetype sprites** (skitter / flyer / bulwark / authority), not one per
  enemy. Twenty enemies is more art than this project can carry, and at this size the
  silhouette is what reads anyway. Bosses always get `authority`.
- The mech is **layered** - base plus whatever is fitted - because "every part you install
  is literally your own body" is the one visual idea the fiction demands. `MechPortrait`
  picks leg sprites off **evasion**, not a movement stat; that check silently broke once
  when travel was removed and nothing caught it, because it was dead data rather than a
  type error.

## The stage

The right-hand column (`Stage.tsx`) is where the art actually lives, and it is permanent
rather than a tab. A tab can only show one thing; what a player wants visible at all
times is not a page, it is **what they are made of and what they are doing**.

It holds three things: the layered portrait, a live readout of the current job (enemy
sprite and its HP when fighting, action and progress bar when skilling, what it is short
of when waiting), and the map pinned to the bottom corner.

**The map zooms and pans**, and it has to. The world is drawn into a 740-unit logical
space shown in a ~270px column, so at 1x the place names land at about four physical
pixels - drawn, and unreadable. Zoom is what makes the names worth having.

It **opens zoomed in on where you are, and follows you**, until the player touches it -
then it stays where they put it, because a map that yanks itself back while you are
reading it is worse than one that never follows. That is the whole meaning of `manual`
being nullable in `WorldMap`: null is "follow", anything else is "the player decided".
The recenter button only appears once there is something to recenter *from*.

Three rules it must keep:

- **Zoom is a canvas transform, not arithmetic on coordinates.** That is what scales line
  widths and font sizes with it. Applying it per-coordinate would spread the nodes apart
  while leaving the labels the same illegible size, which is not zooming.
- **The mech sprite is drawn with that transform reset, at an integer scale.** Vectors
  take any scale; pixel art does not. Under a fractional transform each 1x1 pixel lands
  on a fractional boundary and smears.
- **The wheel handler must not close over `state`.** It is bound once, so it reads the
  current state through a ref. Closing over it directly would freeze the follow view at
  whatever node the mech was standing on when the listener was attached.

`MAX_ZOOM` is bounded by how sparse the graph is rather than by legibility: the visible
window is 740/zoom units and nodes average ~150 apart, so past about 4x you are usually
looking at empty space between two of them. A ceiling of 8 rendered a blank square.

The shell is a **16:9 frame**, centred and letterboxed, because this is a web page shown
to people rather than an app that owns the screen. Everything inside scrolls; nothing
grows. On a phone there is no side, so the stage becomes a compact strip *above* the
content - below it was tried first and buried the mech under a full enemy list - and the
map drops out, being the one part that is unreadable at that width.

The map draws only what you can reach plus its immediate frontier. Drawing all
twenty-four places at once was unreadable overlapping labels.

## The crawler

The second actor, unlocked by wiring in a Traction Core. `maxConcurrentActivities` goes
from 1 to 2 at that moment - the rule has always been a function over `actors` rather
than a hardcoded shape, which is why unlocking it needed no restructuring.

Rules that keep the two actors distinct:

- **Industry only** (`CRAWLER_SKILLS`). You gather and fight; it refines, fabricates and
  salvages. They never compete for the same job.
- **It works wherever it is.** It carries the workshop, so `startSkillAction` never
  moves it. Parking it is cosmetic - it is there so the world has two bodies in it.

## Waiting, not halting

An action short of materials **waits**. It keeps the order, stops accumulating progress,
and picks up the moment stock exists. `waitingFor(state, actor)` derives what it is
short of; there is no stored waiting flag.

This replaced halting when the crawler arrived. With one actor, halting loudly was right -
spinning on an action that could never proceed was pure waste. With two, "the crawler is
out of ingots while the mech refines more" is an ordinary temporary state, and a halted
action never restarts on its own.

**Progress is capped at `affordable * duration`.** Without that cap a long offline step
would bank hours of progress against an empty bank and spend it all the instant one input
appeared.

### The one known step-size dependency

`advance` runs each actor for the whole step in turn, so a single large offline step
refines everything *before* the consumer eats any of it, where live play interleaves them.
Measured with a producer/consumer pair, this is a **constant off-by-one** - one extra
completion whether the span is ten minutes or eight hours - and it favours the player.
Two small step sizes agree with each other exactly; only the giant step differs.

Accepted rather than engineered away, and guarded: a test asserts the gap stays within one
completion and, more importantly, that it does **not grow with the span**. Drift
proportional to time away is the thing that would actually matter.
