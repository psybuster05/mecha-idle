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
