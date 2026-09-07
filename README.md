# Mecha Idle

**▶ Play it: https://psybuster05.github.io/mecha-idle/**

A Melvor Idle-style skill-based idle game. You are a sentient mech that reactivated
alone in the ruins after the end. Skills are not things you learn - they are subroutines
you *recover*, and every part you fabricate becomes part of your own body.

It saves to your browser, so you can close the tab and come back - it credits what you
would have earned while you were gone, up to 24 hours.

## Running it locally

```
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Simulation unit tests |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint, including the sim-purity boundary rules |
| `npm run build` | Production build into `dist/` |

Pushing to `main` deploys to GitHub Pages, but only if lint, tests and the build all
pass first - see [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## The loop

```
Scavenging  ->  Refining  ->  Fabrication  ->  equip  ->  Combat
 raw salvage    usable stock   mech parts       your mech   xp + drops
      ^                                                       |
      +-------------------- salvage and xp --------------------+
```

One action at a time, so every choice costs you the others. A second actor - a salvaged
crawler you dock into, which works while the mech fights - is modelled in the state from
day one and unlocks later.

## Layout

- `src/sim/` - the simulation. Pure TypeScript: no DOM, no React, no storage access.
  `tick(state, dtSeconds) -> state` is the whole interface.
- `src/content/` - balance data as typed tables. Adding a skill or an item should mean
  editing a table, not writing engine code.
- `src/platform/` - the only place a storage backend is touched.
- `src/ui/` - React. Reads snapshots, dispatches intents from `sim/intents.ts`.

The `sim/` <-> `ui/` boundary is the load-bearing one, and eslint enforces it.

See [CLAUDE.md](CLAUDE.md) for the architecture rules and why they exist, and
[ASSETS.md](ASSETS.md) for asset provenance.

## Status

**A proof of concept, not a product.** It is built and it is playable end to end; it has
not been playtested by anyone, which is the honest gap. Everything below is verified by
tests rather than by having been fun to anybody yet.

- Five non-combat skills - Scavenging, Refining, Fabrication, Salvaging, Cartography -
  81 actions between them, each skill with a full 1-99 ladder reachable on time alone
- Four combat skills, seven zones, 26 enemies of which seven are bosses
- Damage types with resistances, three weapon archetypes, boss phases
- A second actor, the crawler, that runs industry while you are out
- A story in 21 fragments, delivered as recovered memory
- Saves with migrations, and offline progress that provably matches having played
- Pixel art stored as data rather than image files, so it carries no licence

**Combat never gates a skill.** Time alone maxes any non-combat skill. Bosses unlock
breadth - new regions, unique materials, story, permanent perks - never height. A player
who never fights still has a complete idle game.

316 tests, most of them about the things that actually break idle games: xp curves,
action rates, offline catch-up, and save migrations.

- [CLAUDE.md](CLAUDE.md) - the architecture rules and why each one exists, including the
  ones that were reversed and why.
