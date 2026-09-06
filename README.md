# Mecha Idle

A Melvor Idle-style skill-based idle game. You are a sentient mech that reactivated
alone in the ruins after the end. Skills are not things you learn - they are subroutines
you *recover*, and every part you fabricate becomes part of your own body.

## Running it

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

## The loop

```
Scavenging  ->  Refining  ->  Fabrication  ->  equip  ->  Sorties
 raw salvage    usable stock   mech parts       chassis    combat
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

v1 vertical slice: three gathering skills, one combat zone, five equipment slots,
saves with migrations, and offline progress. Art is a placeholder CSS pass - pixel art
comes once the loop is proven fun.
