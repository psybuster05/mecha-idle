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
Attack Speed, Bank, Equipment, Log**.

The story archive is the **Log**, not "Recovered". "Recovered" described the *contents*
rather than naming the place, so as a rail item it read as a stat or a status.

The kicker above a story dialog says Log as well. One word for one thing: a player who
reads it on the fragment and then sees it in the rail knows where that fragment went, and
the fiction that these are recovered memories is already carried by the writing itself
rather than by a caption announcing it.

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

The style cards show **what each one trains and what it buys, and nothing else**. They
carried a line of flavour each and it was the wrong place for it: this is a control you
read while deciding, and four sentences of prose between four pairs of numbers is
something to scroll past rather than something to read. The `description` field went with
the markup - a field nothing renders is dead data, which is exactly how `MechPortrait`
ended up reading a stat that no longer existed.

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

## The opening: one subroutine at a time

A fresh mech used to wake with all four non-combat skills on the rail and no reason to
touch any particular one. That is a menu, not a beginning - and it wasted the one piece of
fiction this game has that no other idle game does, which is that skills are **recovered**
rather than learned.

Each is gated behind the skill that *feeds* it, so the dependency chain teaches itself in
the order the bank already implies:

| Stage | Opens at | Measured, playing the chain |
|---|---|---|
| Scavenging | you wake with it | 0 |
| Refining | Scavenging 5 | ~30s |
| Fabrication | Refining 5 | ~2 min |
| Salvaging | Fabrication 5 | ~8 min |
| Crawler schematic | Fabrication 10 | ~26 min |

Those are *real* minutes at `DEMO_PACE`, from a standing start, with **no combat at all** -
the same contract every other lock in this game keeps. The table lives in
`content/tutorial.ts`, evaluation in `sim/tutorial.ts`, exactly as story is split.

Four rules, all tested:

- **Derived, never stored.** The same choice `waitingFor` makes. A stored flag is a second
  copy of a fact that can fall out of step with the first; deriving it from levels means no
  new save field, no migration, and nothing for an older save to be missing.
- **Monotonic, so a level and never a bank count.** The story rule from the other side:
  spending your last ingot must not take a skill back off you, and a single large offline
  step must not miss a condition that many small ones caught.
- **Nothing is ever taken away.** A skill with *any* xp in it is open whatever the
  requirement says. Saves predate this chain and materials drop in combat too, so somebody
  can plausibly hold Refining levels with Scavenging at 1 - and hiding a skill they trained
  would be taking progress away, which nothing here is allowed to do. It is also what makes
  every existing save open everything the moment it loads.
- **The gate is a rule, not a rail.** `startSkillAction` refuses a skill that has not been
  recovered, so hiding the button is a *consequence* of the rule rather than being the rule.

The rail shows what is open plus **one** locked stage - the same frontier rule
`visibleNodes` keeps on the map. The whole remaining chain would be a roadmap; none of it
would leave a player who has seen one skill with no reason to believe there are others.

Combat is deliberately untouched: Fight and its five skills are there from the first
second. This gates the industry ladder, which is the half that has an order to it.

One trap this set, worth knowing before writing another sim test: **four existing tests
started Refining on a fresh game and silently got nothing.** `opened()` in
`sim/__tests__/support.ts` is the fixture helper, and it uses the escape hatch above -
one xp, which moves no level, no rate and no yield chance - rather than granting the
feeder skill its requirement level, which would have quietly changed the bonus-haul odds
those very tests were measuring.

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

**Dialogs open at the top, with the button focused but not scrolled to.** `autoFocus`
scrolls the focused element into view, and on a dialog taller than its box the button is
at the bottom - so the game's *ending* opened 124px down, past its own title and first
line, and a player who skims pressed Continue having never seen how it begins.
`useFocusAtTop` focuses with `preventScroll` and resets the container to the top; Enter
still dismisses, so a keyboard player loses nothing. The story and offline dialogs both use
it. Do not put `autoFocus` on a button at the foot of anything that can overflow.

## When the browser disagrees with the tests

Vite caches transformed modules in `node_modules/.vite`, and that cache **survives a dev
server restart**. If behaviour in the browser contradicts a passing test, run the exact
state through the real code in a scratch test first; if Node is right and the browser is
wrong, delete `node_modules/.vite` **and** restart - neither alone is enough. This has now
cost time three times.

Its loudest form is a console error naming an export that plainly exists: *"does not
provide an export named X"* for a symbol sitting in the file. That is always this, never
the code.

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

## The test timeout is 30 seconds, on purpose

Not vitest's 5s default. This suite simulates hours of game time: on an idle machine the
two offline-drift tests take ~4.2s and ~3.9s, already at the edge, and under load a combat
test that normally takes 1.4s timed out at 5s and passed untouched on a re-run.

A random timeout is not harmless here, **because the deploy runs the suite** - it would
block a fix from shipping at exactly the worst moment, mid-playtest with someone waiting
on it. Verified by running three suites at once plus a build: 394 passing in each, no
timeouts. 30s is headroom for a slow CI runner, not a performance budget; a test that is
genuinely getting slower shows up in the suite's duration long before it reaches this.

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
- **Every rail row has an icon, not just the skills.** `MENU_ICONS` covers Equipment,
  Crawler, Bank, Log, the save slots and reset. Without them the Character and Saves
  groups read as a footer rather than as part of the same list. Each was drawn against
  what it sits near: `equipment` is deliberately not a torso because `SLOT_ICONS.frame`
  already is one, `crawler` is low and wide where `SLOT_ICONS.legs` is a tall bent leg,
  and nothing hangs three prongs downward, because that silhouette is Scavenging's.
- **One save icon for all three slots, not three.** A fill level - empty, half, full - is
  the obvious idea and it is a claim the icon cannot keep: "Your game" is at whatever
  stage the player actually reached, as likely to be past Endgame's as behind Mid-game's.
  The names say which is which; the icon says *this row is a save*.
- **Two icons must not need colour to tell them apart.** Cartography shipped as a compass
  rose that collapsed into the same cross as Hitpoints at 16px; only the green said which
  was which, which is exactly the failure the colour rule above is meant to prevent. It is
  a survey grid now. Look at every icon next to its neighbours before believing it works.
  That rule caught the first `equipment` icon too: the figure inside its brackets was
  drawn small enough that it read as a blob, and only looking at it beside Crawler and
  Bank at size showed it. It fills the frame now.
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

It holds three things: the mech standing in a scene, a live readout of the current job
(enemy sprite and its HP when fighting, action and progress bar when skilling, what it
is short of when waiting), and the map pinned to the bottom corner.

**In combat the scene shows the encounter**, not just your chassis: the mech steps to
one side and whatever it is fighting stands opposite, both on the same slab, with the
readout below keeping the name and HP. **Bosses are drawn a third taller** than anything
else - standing a boss the same height as a Scrap Crawler undersells the moment.

**The readout shows the boss's phase**, not just its HP. A phase change is the whole point
of the boss design - it is what inverts which weapon is right - and it used to appear only
on the Combat tab, which a player with the game on a second screen is almost never on. The
stage carries the same banner the Combat tab does: the phase name, its one line, and an
orange edge because the colour language says orange is hostile. It is keyed by phase name,
so each new phase mounts fresh and flashes **once** on arrival and then settles - the
change is the event worth seeing, and a banner that kept pulsing through a five-minute
phase would be noise by the second minute. It is a live region, so a screen reader
announces the shift. No banner at all outside a phase, including on every non-boss.

**The figure reacts to a timer that just reset.** In combat that is the attack clock -
it counts up to the interval and resets, so each side lunges on its own swing. Skilling is
the same cue: an action's progress counts up to its duration and drops by it, so every
completion lands a *stroke*. Both are found by diffing snapshots, the same way item gains
are found, and the simulation stays unaware anything is drawn. One hook, `useMotion`,
because they are one idea.

Driven through `element.animate()` rather than a CSS class because replaying a CSS
animation means removing the class, forcing a reflow and putting it back, or remounting -
and remounting would tear down and redraw the sprite canvas on every swing. Skipped
entirely under `prefers-reduced-motion`.

**Working also needs a motion between the strokes.** An action takes seconds, so a figure
that only twitched on completion would stand dead still for most of the job - which is
exactly what an idle mech looks like. A continuous bob says *busy*; the stroke says *that
one is done*. Its period is `1s / effectiveSpeed`, so work running three times as fast
looks it, and it stops while an action is **waiting** for materials, because a mech
hammering on nothing contradicts the readout directly beneath it.

Two things the work motion does that the lunge does not, both deliberate:

- **It moves a whole number of *sprite* pixels, stepped rather than eased.** A fractional
  transform lands each 1x1 sprite pixel on a fractional boundary and smears it - the same
  reason the art rules allow only integer scales. A 190ms lunge blurs for a blink; a bob
  is on screen for minutes, which is where that shows.
- **The bob sits on a nested element.** Both are transforms, so on one element the
  stroke's animation would override the bob for its whole duration and snap the mech
  straight. Nested, they compose.

**Each skill works differently**, and the four are told apart by *axis, depth and rate*
rather than by what a pair of arms is doing - the mech has no articulated parts, so the
whole figure is the only thing there is to move. Scavenging **stoops** to the ground and
straightens. Refining **leans** sideways into a furnace, slowly, and is the only one that
holds a position off the vertical. Fabrication **taps**, at twice the rate and half the
depth, and its stroke rises before it falls - the one motion with an anticipation in it,
because assembly is precise rather than heavy. Salvaging **wrenches** side to side, the
widest travel of the four and the only bob that crosses its own resting position.

The differences are deliberately large. A subtle distinction at 96px is no distinction,
which is the same reason two icons must not need colour to tell them apart, and the reason
the first pass here shipped one shared motion instead of four timid ones.

`WORK_STYLES` is a `Record<GatheringSkillId, WorkStyle>` on purpose: a fifth gathering
skill is a compile error asking what it looks like, not a skill that silently works in
mime.

Positioning had to move for this. The idle figure used to be centred with
`translateX(-50%)`, which is a transform, so any animated transform on it would have
thrown the mech half its width to the left. It is centred by flex now, leaving transform
free in every state.

The two figures are anchored to the slab's own edges rather than to centre points, and
that is what lets sizes differ: a fixed centre only works while both sprites are the same
width, and the moment bosses grew it pushed them off the end of the ground they were
meant to be standing on. The budget is tight - a ~271px scene less 6% margins leaves
~238px, and a 96px mech against a 128px boss clears by about thirteen pixels - so this is
as far as boss sprites go without a wider stage. Which side the mech stands on is keyed off the
*activity* rather than off there being an enemy right now - keyed off the enemy it would
slide back to centre after every kill and out again a second later, once per respawn.

**The scene is a drawn landscape**: a dead skyline over rubble, with a floor to stand
on. It was two rectangles for a long while - a darker slab inside a lighter box - which
was enough to stop the mech floating in the panel background but never enough to be a
*place*. The art is `SCENE_BACKDROP`, data like every other sprite here. The sky stays a
CSS gradient, because a gradient is what a sky is, and the backdrop's top third is
transparent so it shows through: the art starts where the horizon does.

Four things it has to keep:

- **Authored at 48x36, the one place the 16x16 rule bends.** Sixteen pixels is a *thing* -
  an item, a face, a silhouette read in one glance. This is a place, and a place is mostly
  relationships between things: how far the towers sit behind the rubble, how much sky is
  above them. At 16x16 there is no room for a relationship, only for one shape. The sprite
  suite has an `OVERSIZE` list that still applies every other check to it and pins the
  declared size, because an exception nothing pins is just a sprite of whatever size it
  drifted to.
- **Drawn at the mech's scale and cropped, never scaled to fit.** Fitting means a
  fractional scale - the thing that turns pixel art to mush - and a backdrop whose pixels
  are a different size from the figure standing on it does not read as one world. The
  panel is 271px wide and the backdrop is 288: the overflow is thrown away.
- **The towers are lighter than the sky, not darker.** Silhouetting them was the first try
  and it vanished: the sky at the horizon is already near-black here, so a darker tower has
  nothing to be dark against. They are drawn at two depths for the same reason - one value
  for all of them read as a row of blocks rather than a city with distance in it.
- **No signal colour appears in it.** No orange, no cyan, no player blue. Orange is hostile
  and cyan is a live readout, so a backdrop borrowing either would put something in the
  scenery that a player has been trained to look at.
- **Cloud is streaks, not puffs.** At six screen pixels to the sprite pixel a puffy cloud
  is three lumps and reads as a cartoon; a long horizontal band reads as weather over a
  dead city. They are written row by row rather than generated from a rectangle, because
  the shape of the *ends* is the whole difference between a cloud and a pale bar, and a few
  pixels are punched out of each one for the same reason. The sky itself stays the CSS
  gradient underneath - a gradient is what a sky is.
- **Three planes, and the nearest is the lightest.** Skyline, mid rubble, then foreground
  debris drawn below the ground line - the only things in the backdrop brighter than that
  line, each with a lit top edge and a shadow at its foot. That contrast order is what puts
  them in *front* of the floor rather than on it. They stay desaturated all the same: a
  saturated chunk would compete with the mech standing behind them.
- **The foreground runs through the middle, not only along the edges.** A phone crops this
  to its middle third, so edge-only debris would be a foreground that exists on a desktop
  and nowhere else.

Nothing is drawn in the top two rows: the scene crops 12px off the backdrop's top, so art
up there is art nobody sees. The first cloud sat in that band until it was measured.

A shadow is only cast onto *floor*. Painting one under every mass unconditionally put a
dark band through anything with a second piece stacked on it - a shadow cast onto the thing
casting it, which reads as a crack rather than as contact.

**The feet are placed from the art, not from a percentage.** `SCENE_GROUND_ROW` says which
row is the surface; `Stage` turns it into a `--ground` pixel offset and `.stage-figure`
sits on it. It was `bottom: 28%` before, which is a second copy of a number that only ever
agreed with the art by coincidence - and did not: the mech stood three pixels off the
floor. Whatever unit you use, keep it on `bottom` rather than a margin, because **a
percentage `margin` resolves against the containing block's width, not its height**, which
once put the mech knee-deep at 14% and floating at 28%.

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
grows. On a phone there is no side, so the stage becomes a strip *above* the
content - below it was tried first and buried the mech under a full enemy list - and the
map drops out, being the one part that is unreadable at that width.

That strip needs its own size, and for a while it did not have one: the rule sizing it
still named `.stage-portrait`, a class that stopped existing when the portrait became a
scene. **A stale selector matches nothing and reports nothing** - the same silence a
mistyped item id gives - so the scene had a 4:3 ratio, no width to apply it to, and
collapsed to about two pixels on every phone. It is 150x160 now, which is what the picture
actually needs: the ground line sits 60px up and the mech is 96px tall.

The map draws only what you can reach plus its immediate frontier. Drawing all
twenty-four places at once was unreadable overlapping labels.

The rail's half of the phone layout is its own section below.

## The Equipment page leads with the gear

Fitted slots first, then the stats they add up to, then spare parts in the bank, then boss
perks last. It was the other way round - a portrait, a stat grid and every perk above the
slots - and at a laptop viewport the first fitted slot started **1,372px down**, two
screens of scrolling to reach the one thing the page is for. Put what a page is *for* at
its top; put what it merely *contains* underneath.

The portrait went entirely rather than moving: the stage draws the same mech, larger, on
every tab, so here it was a second copy of the picture. Its "5 of 5 fitted" caption moved
onto the Equipped heading it was describing. The stat grid is three across, because six
stats in an auto-fit grid left Attack Speed alone on a second row.

## The crawler

The second actor, unlocked by wiring in a Traction Core. `maxConcurrentActivities` goes
from 1 to 2 at that moment - the rule has always been a function over `actors` rather
than a hardcoded shape, which is why unlocking it needed no restructuring.

Rules that keep the two actors distinct:

- **Industry only** (`CRAWLER_SKILLS`). You gather and fight; it refines, fabricates and
  salvages. They never compete for the same job.
- **It works wherever it is.** It carries the workshop, so `startSkillAction` never
  moves it. Parking it is cosmetic - it is there so the world has two bodies in it.

## Toasts

Transient notices in the bottom corner, and **purely a view concern** - the simulation
never knows they exist. Item gains are found by *diffing bank snapshots* in the UI rather
than by having the sim announce anything, which keeps `sim/` pure and keeps this what it
is: a view noticing that a number changed.

Two kinds, and the difference is about volume. A **notice** is rare and one-off (no fuel
for that). A **gain** is a stream - an item lands every few seconds, faster at 3x with
two actors - so gains sharing a key merge into one line that counts up. A scavenging run
shows a single growing "+24 Scrap Steel", not twenty-four toasts fighting for the corner.
Five on screen at once is the cap.

**The first *loaded* snapshot is deliberately compared to nothing**, and the emphasis is
load-bearing. Diffing it against an empty baseline would fire a toast for every item
earned overnight; the offline dialog already reports that in a form that can hold it.

The first snapshot React renders is **not** the save - it is the empty default the store
boots on, before the adapter has answered. Taking the baseline there put an empty bank
against a restored one and toasted the whole night's haul, which is what shipped until it
was seen on a real save. `useItemGains` therefore takes `ready` rather than working it
out from the state, and records nothing at all until the save is in.

Losses are ignored: spending materials is something you chose and are already looking at.

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

### Fuel is a throttle, not a timer

A **1x / 2x / 3x toggle** in the top bar, drawn as one, two or three chevrons - the
fast-forward metaphor everyone already knows. Those are SVG rather than pixel sprites,
unlike every other icon in the game, because they have to invert against the selected
button and `currentColor` can do that where a canvas cannot. The art rules are about
game content; this is a transport control.

Fuel drains while the toggle is above 1x; at 1x it costs nothing. It drops from
Scavenging, from every regular enemy, and three at a time from every boss - deliberately
generous, because this is a proof of concept and running out is not the interesting part.

**The toggle always shows what is actually happening.** Asking for a speed you cannot
afford bounces straight back to 1x with a red toast, and the tank emptying mid-job does
the same on its own. A toggle reading 3x while work runs at 1x is the confusing version,
and running out is otherwise the one fuel event with no visible cause - work quietly
drops to a third speed and nothing on screen would say why.

The buttons stay **clickable rather than disabled**. A disabled control tells you that
you cannot press it and never what would let you; the toast names where fuel comes from.

**Nothing burns while nothing is running.** Fuel buys work, so an idle mech at 3x spends
nothing - otherwise leaving the tab open on the equipment screen would quietly empty a
tank you had been saving. Either actor counts: the crawler refining alone is work.

**Fuel is energy, not time.** Each item's `{ multiplier, seconds }` is read as
`seconds * (multiplier - 1)` units, and running at speed M spends `M - 1` per second.
That reinterpretation was picked because it leaves both items worth exactly what they
were worth under the old burn-a-flask model - a Catalyst Flask is still 600s at 2x, an
Overcharge Cell still 420s at 3x - so the mechanic changed without retuning a number.

Rules it keeps:

- **The toggle is a preference, not a rate.** It stays where the player put it when the
  tank empties, so finding fuel later resumes at the speed they asked for. `state.speed`
  is what they chose; `effectiveSpeed()` is what is running. The read-out shows both,
  because a toggle claiming 3x while running at 1x is the confusing version.
- **Cheapest fuel burns first**, in a fixed order. Deterministic order is what makes the
  offline guarantee hold - the same fuel must be spent however the time is sliced.
- **`advance` splits at the moment the tank runs dry**, exactly as it used to split at a
  boost expiry, because action duration depends on whether fuel is burning.
- **Combat is fast-forwarded, not made easier.** The dt handed to combat is multiplied
  by the speed, so your swings, the enemy's, regeneration and respawn all run at the same
  rate. The same exchanges happen in the same order, just sooner. Scaling only the
  player's side would have been a power boost, and every boss budget in the game was
  measured without one.

  Measured across all seven bosses at 1x, 2x and 3x when this landed: **every win/lose
  outcome identical**, times scaling 2.01x and 2.99x. Two of those fights are kept as
  tests - one winnable, one not - because a 3x that made an unbeatable fight beatable
  would have quietly re-tuned the whole game.

## The demo pace

**One real second buys ten game seconds.** `DEMO_PACE` in `src/sim/pace.ts`.

The design pace is a month to max a skill - 503 hours, asserted by the pacing suite - and
that is the right number for the game this is a prototype of. It is the wrong number for
what it currently *is*, which is a link handed to someone who will give it fifteen
minutes. Measured at 1x, those fifteen minutes reach Scavenging 8 and combat level 4: one
region, no boss, no crawler, no second region. The loop, not the game.

**It is applied where the clock is read, in the driver, and never inside `tick`.** That is
the whole design:

- No content number changes. Not a duration, not an xp value, not a boss. Every existing
  measurement still means what it meant, and the second game inherits real numbers rather
  than demo ones.
- The simulation still measures game seconds, so the pacing suite still asserts 503 hours
  and knows nothing about any of this.
- Putting it back is one constant.

It rides on the dilation the speed toggle already used, which was measured across all
seven bosses at 2x and 3x with every outcome identical. Combat steps event by event
rather than in fixed slices, so a larger dt is exact rather than approximate. Measured
after: **10.4, 20.0 and 28.9 xp per real second at 1x, 2x and 3x**, against a design rate
of 1 xp per game second.

Three consequences, all handled:

- **Fuel needed no adjustment.** It drops per completion and per kill, so income and drain
  scale together and a tank is worth exactly the same amount of *work* as before.
- **The top bar's fuel note is always a length of time.** At 1x it used to show the tank's
  raw energy - `57602520 fuel` - a unit nobody playing knows and nothing they can act on.
  It reads `800h at 3x` now: at 1x nothing drains, so it shows the fastest speed, which is
  the number that answers "how much do I have".
- **A time readout in game seconds becomes a lie.** The fuel note promises a stretch of
  wall clock, so it divides by the pace - it read `3425520.0s` before and reads `95h 9m`
  now. Anything else that counts down to the player has to do the same. Nominal action
  durations in the skill panels do not: they are a spec for comparing actions, and already
  ignore gear and the toggle.
- **The offline cap is on time *away*, dilated after capping**, so "at most a day of
  absence" still means a day. The largest step the game can take is therefore
  `MAX_OFFLINE_SECONDS * DEMO_PACE` - 240 hours - and the drift guard measures there now
  rather than at 24.

What it does not fix: the second region is still about twenty real minutes of fighting
away, because 3.3 hours of combat compresses to 20 minutes and no further. Pace alone
cannot put a boss in front of a fifteen-minute visitor - **which is what the save slots
below are for.** Two tests hold the line that was bought - `what a visitor sees` in the pacing
suite - so lowering the pace fails loudly rather than quietly shipping the loop without
the game.

## Save slots: one played, two to be dropped into

Three saves. **Your game** is the playthrough; **Mid-game** and **Endgame** are stages a
tester can jump straight to, because the pace note above is right that no amount of
speeding the clock up puts the endgame in front of somebody with fifteen minutes.

They live at the **foot of the rail**. The top bar is for what is true right now - your
health, and how fast the clock is running - and a save picker is neither.

**One row, a native select, not a row per slot.** It was three rows plus a reset row, all
pinned in view, and at a laptop's real viewport that pushed half the navigation out of
sight to make room for a control a tester touches once. Rarely used means compact: the
rail's space belongs to what you press every minute. A native `<select>` because the job is
exactly "pick one of three", and it brings keyboard handling, labelling and a phone-sized
picker for nothing. Reset is an icon button beside it, named in full in its title and
label, since an icon alone would not say which save it resets.

They are **stages, not difficulties**: a plausible snapshot of somebody's playthrough -
levels, bosses down, gear fitted, a bank with something in it - so what gets poked at is
the real game at that point, not a sandbox with the numbers turned up. Definitions in
`content/presets.ts`, the builder in `sim/presets.ts`, split the way story and the
opening are.

Things that had to be got right, each of which was a way to hand somebody a broken save:

- **Slot 'own' keeps the original save key.** That is the entire migration. Every save
  that predates slots is already the played one, and not moving it cannot fail - where a
  copy-then-delete has a window in which a playthrough lives nowhere.
- **Presets are built, never hand-written.** Hand-written state is a second copy of the
  state shape that nothing keeps in step: it survives renames by silently being wrong, and
  a save that no longer parses is one a tester meets as a crash. A test round-trips each
  through the real `serialize`/`deserialize` and asserts it comes back *unchanged*, not
  merely parseable - a preset that needs repairing on load was built against a shape the
  game no longer has.
- **Everything already earned is already read.** `buildPreset` runs the story evaluator
  and moves the lot into `seen`. Without it the first frame queues a beat for every boss
  down and every level passed, and whoever picked Endgame meets a stack of interrupt
  dialogs instead of the endgame.
- **`savedAt` is stamped now**, so opening a preset for the first time credits no offline
  progress. A `savedAt` of 0 reads as an absence since the epoch.
- **Gear is derived from the fabrication table, not listed by id**, so a new tier lands in
  the presets the day it lands in the game. Ties go to whichever recipe is written last,
  which is where content tables put the capstone of a tier - that is what hands Endgame The
  Sentence and the Command Frame rather than the first level-90 rows in the file.
- **A preset must be able to enter the fight it stops in front of.** The two gates are
  independent - a node unlocked by the last kill, and a combat level the *zone* asks for -
  so passing one says nothing about the other. Endgame shipped at combat level 90 against
  a Switch Room that wants 95: a save whose blurb promised a fight it could not walk into.
  A test now checks both for every preset.

**Switching saves the current slot and reloads the page.** Blunt and deliberate: booting a
slot means loading, migrating, crediting time away and restarting the clock, and that path
exists and is exercised exactly once, at boot. Re-entering it in place would mean resetting
the state ref, the frame loop, the autosave timer and the toast baselines together, and the
failure mode if any one of them lagged is the autosave writing one slot's game over
another's. On a static page a reload costs nothing; a playthrough costs everything.

**Resetting takes the same road**, and it is what makes the preset slots reusable - a
tester who spent an endgame bank, or who wants to watch the opening again from nothing,
gets the slot back rather than being stuck with what they did to it. `own` resets to a new
game; the presets reset to what they ship as.

The order is the whole trick, and getting it wrong is silent:

    stopSaving()  ->  adapter.clear()  ->  reload

**Clearing the key is not enough on its own.** The autosave interval, the
`visibilitychange` handler, the `beforeunload` handler and the store's own unmount
cleanup would each write the in-memory game straight back into the slot that was just
deleted - which is the same trap that ate hand-edited saves repeatedly during browser
testing. `stopSaving()` sets the very flag an unreadable save sets, because there is one
meaning of "do not write over what is on disk" and it should have one place that decides
it.

Confirmed before it happens, and the confirm **names the slot and says what comes back**.
"Are you sure?" asks about something the player has to remember clicking; the answer here
is unrecoverable.

## Sending it out to be played

Three things exist only because somebody who is not the author is going to open this.

**A report a tester can send back.** At the foot of the rail: a Copy report button and a
link to the repo's issues. The button is the important half - "it broke" is a sentence,
and the same sentence with a save attached is something that can be loaded and looked at.
`diagnostics.ts` builds a readable header (slot, save version, what they were doing,
bosses down) over the serialised save, split by a marker line. A test round-trips it:
the save half of a report must still `deserialize`, or the report only looks like
evidence.

A refused clipboard falls back to the text in a selected box rather than an apology.
`navigator.clipboard` can be denied for reasons the player did nothing to cause, and the
times it is denied are unevenly distributed - they land on whoever has the unusual
browser, which is also the person most likely to have found something.

**A crash screen instead of a black page.** `ErrorBoundary` is the only class component
in the project, because `getDerivedStateFromError` has no hook equivalent. It sits
*outside* `App` in `main.tsx` - a boundary cannot catch what the component it lives in
throws. It says "your save is safe" first, because that is the only question a player
actually has at that moment, and it is true: **nothing writes to a slot after a failure.**
The report it builds reads the save back off disk rather than serialising memory, since
memory during a crash is precisely what should not be trusted. Verified by making `Stage`
throw on purpose: crash screen, error named, stack naming Stage, save intact on disk, and
a 2.4KB report carrying all of it.

**Which build a report came from.** Reports arrive over days and fixes ship in between.
Before this a report carried only the *save* version - 7 on every build - so one filed
against the build before a fix and one filed after it were identical. `ui/build.ts`
exports `BUILD`, which the deploy workflow supplies as `VITE_BUILD` (the commit it checked
out) and `VITE_BUILT_AT`; Vite writes both into the bundle. It is in both report headers
and faint at the foot of the rail.

It comes from whatever *built* the page rather than anything the page reads, so it cannot
be wrong about which code is running. A dev server says `dev` and an undeployed local
build says `local`, rather than borrowing a SHA that would claim to be something it is not.

**Three sentences of orientation.** The first thing a new player reads is *Cold Start*,
four paragraphs of atmosphere that tell them nothing about what to do. Somebody handed a
link does not know this is a genre where you pick one job and leave, that closing the tab
is allowed, or that there is a speed control. None of that belongs in the fiction, so
`FirstRun` says it in the plainest words in the game.

It is **derived, not dismissed**: shown while the player has done nothing - no activity,
no xp anywhere, empty bank - and gone the moment they start. No flag, no save field,
nothing to migrate, and nothing left stuck if somebody resets a slot. The same choice the
tutorial and `waitingFor` make.

What none of this fixes, and what a playtest of this build cannot tell you:

- **Fifteen minutes can answer** whether the opening is legible, whether the loop feels
  good, whether combat is readable, and whether anybody wants to open it again tomorrow.
  It cannot answer whether the 500-hour curve is right.
- **The fuel economy will not be answered honestly.** Drops are deliberately generous and
  idle no longer burns, both on purpose. "Am I running out too fast" is not a question
  this version asks.
- **No number in this game has ever been felt.** Every one is simulation-validated. That
  is the whole reason for the playtest, and the reason not to touch any of them before it
  - changing them now destroys the baseline the feedback would be measured against.

## The rail scrolls; its foot does not

`.rail-scroll` takes the skills and scrolls; `.rail-foot` holds the saves and the report
line and stays put. The same split the stage makes for its pinned map, with the same
mechanism - a `flex: none`-ish sibling against a scrolling one rather than `position:
sticky`.

The whole rail used to scroll as one, which put both of those below the fold on any window
shorter than about 900px. Neither is something you scroll a navigation column to find: a
tester who never thinks to scroll it never learns the save slots exist, and the save slots
are the entire reason a tester can see the endgame.

The foot is **shrinkable rather than fixed**, and the list holds a `min-height`. On a very
short window a fixed foot would eat the column and leave nowhere to pick a skill; below
that floor the foot scrolls internally instead, which is the lesser of the two failures.

**The list gives way first, and that needs a shrink *ratio*, not just both being
shrinkable.** Flex shrinks items in proportion to `flex-shrink x flex-basis`, so with both
at 1 they gave way *together* - and at 1366x768, the commonest laptop screen there is, the
foot was squeezed to 218px of its 312 while the list still had 330px to spare above its
floor. That hid **Copy report**, the one control the playtest exists to make findable. It
went unnoticed because the foot had grown since it was last measured: the build stamp
added one line and pushed the button over the edge. `.rail-scroll` shrinks at 1000 now,
so it absorbs everything until it bottoms out at 120px.

Re-measure this whenever the foot gains a line.

**Measure at the viewport a player actually has, not the screen size.** A 1366x768 laptop -
still the commonest - loses about 110px to the browser's tabs and address bar, so the page
gets roughly 1366x657. Measured at the screen size, the rail looked fine; at the real
viewport the whole Character group (Equipment, Crawler, Bank, Log) was below the fold. The
fix had four parts, and it took all of them:

- **The saves collapsed to one row** and the report to one line: the foot went from 275px
  to 96.
- **The five combat skills became one strip** of icon cells, each with its level and a
  sliver of xp, instead of five full rows. They are reference pages - what a level buys -
  so they are the ones that can share a line; every level stays visible, every page one
  click away, and Combat still comes first. Named in each cell's title and to screen
  readers, since the icon alone is not a label. On a phone they become chips like every
  other destination.
- **The idle hint went.** "Nothing is running..." repeated the stage, which already reads
  "Idle." on every tab - two places saying one thing, and one of them cost 76px.
- **Rows run at about 32px**, the density of Melvor's sidebar, with 4px rail xp bars.

All fourteen destinations in view at 1366x657, 1366x768 and 1536x750.

One trap from doing it: the list's 120px desktop floor leaked into the phone layout, where
it made the one-row nav strip 120px tall with every chip stretched to fill it. The phone
rules turn it off. A floor meant for a column is wrong for a row.

## On a phone

The stage becomes a strip above the content, the map drops out, and the rail becomes a
sideways-scrolling nav strip with its foot on a line beneath. Three things were broken
there and none of them looked broken:

- **The document scrolled 1,528px sideways.** The rail's `overflow-x: auto` was overridden
  by a later `.content, .rail, .stage { overflow: visible }` in the second mobile block, so
  the strip never clipped and the *page* did the scrolling instead. Nothing was visibly
  wrong - the page just had one and a half screens of nothing to the right of it.
- **The speed toggle was off the right edge.** Brand, HP and the chevrons need 545px side
  by side and a phone has 375. The topbar wraps now: brand and speed on the first line, HP
  on the second, being the part that actually wants width. It is worth being specific about
  how bad this was - the first-run card tells a new player to look for a control that was
  not on the screen.
- **The saves and the report sat 1,821px along that strip**, which is the same as not
  existing. They are their own row now, and the saves scroll sideways within it rather than
  wrapping to two lines, because everything above the fold on a phone is expensive and this
  is a thing you use once. It has to be *findable*, not prominent.

The lesson that generalises: **a layout bug on a phone shows up as a number, not as a
mess.** All three of these rendered perfectly plausibly. What found them was measuring
`scrollWidth - clientWidth` and the bounding boxes of controls, not looking at a
screenshot.

## Salvaging is derived, not written

`SALVAGING.actions` is generated from `FABRICATION.actions` **and** `REFINING.actions`.
Stripping reverses Fabrication, recycling reverses Refining; everything makeable is
takeable-apart, at the level that made it, returning `floor(50%)` of that recipe's
inputs. 40 actions, none of them hand-written.

Both halves are one skill rather than two because they are the same operation at
different depths. A separate Recycling skill would have been a second ladder trained by
consuming things you had to make first - the shape that got Cartography deleted.

It was hand-written and had quietly stopped keeping up: **8 of 23 fabricable items**, and
the fifteen it missed were the entire late game - the Harpoon Launcher, The Sentence, the
Command Frame. A skill whose job is "a sink for gear you have outgrown" did not work at
the point you have the most outgrown gear. That is the same failure as the nine orphaned
recipes, and deriving it makes the class unrepresentable rather than merely fixed.

Rules the derivation has to keep, all tested:

- **Always a net loss.** Building and stripping in a loop must never beat gathering.
  Flooring each input guarantees it - currently 33-50% back by unit count, never more.
- **Never empty.** Flooring can reach zero for a recipe made of single units. There is
  none today, so the fallback (keep one of the largest input) is untested by the content
  and guarded by a test instead.
- **The same xp per second as the recipe it reverses.** Duration and xp are both scaled
  by 0.6, so Salvaging lands on the same 1-99 curve as everything else. Rounding xp to a
  whole number broke this once: smelting pays 4 over 4s, and its teardown rounded to 2
  over 2.4s - a quarter worse per second than its level-mate, which the pacing suite
  caught as a trap action. Both are kept to one decimal, which is exact because every
  source duration and xp is a whole number.
- **Flavour is a lookup, not a generated string.** Deriving gained coverage and lost
  voice; twenty-three copies of one sentence is worse writing than eight good ones. The
  hand-written lines are kept in `FLAVOUR`, keyed by item so they survive renames.

Only fabricated things can be stripped. Raw scrap has no constituents - "salvaging" an
ingot into half an ingot is a furnace, not a teardown.

## Yield, and why it is not a skill

Every gathering skill raises **its own** bonus-haul chance as it levels: +0.3% per level,
so +29.4% at 99, stacking with the boss yield perks on the same number. It grants
**items, not xp**, so it changes what you end up holding and never how fast you level -
which is what keeps the one-month target measurable.

This was Cartography, and Cartography was deleted. As a separate skill the bonus had a
shape no idle game should ship: you stopped gathering in order to train the thing that
made gathering better. Measured, maxing it cost 504 hours and needed **1,715 hours** of
gathering afterwards to break even, in a game with about 503 hours of content - worth
taking to level 30, a trap past 70. A skill raising its own yield has no such choice to
get wrong, and is strictly weaker: maxing one skill used to pay out across all of them.

Removing a skill is a **migration**, because skill ids live in save files. It also
exposed a real hole: `withDefaults` spread the saved skills over the defaults, which
*preserves keys the game no longer knows about*. A build still carrying the skill had
written a save at the new version number, so the migration never ran on it and the dead
key survived every subsequent save. Skills are now copied key by key from `ALL_SKILLS`,
which makes a stray one unrepresentable rather than merely migrated once.

## The one known step-size dependency

`advance` runs each actor for the whole step in turn, so a single large offline step
refines everything *before* the consumer eats any of it, where live play interleaves them.
Measured with a producer/consumer pair, this is a **constant off-by-one** - one extra
completion whether the span is ten minutes or eight hours - and it favours the player.
Two small step sizes agree with each other exactly; only the giant step differs.

Accepted rather than engineered away, and guarded - but the guard had to change when
yield became level-dependent. Producers now *accelerate* across a span, so the absolute
gap scales with how much was made while the **error rate** does not. The test therefore
asserts the drift is within one completion *or* under one percent, and that it does not
grow with the span, measured out to the 24-hour offline cap. Drift proportional to time
away is still the thing that would actually matter; it is just no longer visible as a
constant.
