/**
 * Serialising, validating and migrating saves.
 *
 * Rule for this file: an existing save must never be broken by an update. Every
 * shape change gets a migration, and anything unrecognised is repaired with defaults
 * rather than thrown away. Idle players do not forgive lost progress.
 */

import { getCombatStyle } from '../content/skills/combat'
import { newGame, SAVE_VERSION, type ActorId, type GameState } from './state'

export type LoadResult =
  { ok: true; state: GameState; migratedFrom: number | null } | { ok: false; error: string }

/**
 * A migration rewrites a save from version N to N+1.
 *
 * There are none yet - version 1 is the first shape - but the mechanism ships now,
 * tested, because the first time it is needed it will be needed urgently.
 */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

/**
 * Combat skills were renamed from mecha jargon to the standard RPG terms players
 * already know. The ids live in save files, so the xp has to be carried across by
 * hand - withDefaults would otherwise fill the new keys with zero and silently
 * throw away every combat level the player had earned.
 */
const RENAMED_COMBAT_SKILLS_V1: Readonly<Record<string, string>> = {
  targeting: 'attack',
  servos: 'strength',
  plating: 'defence',
  structure: 'hitpoints',
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  /**
   * 3 -> 4: travel was removed.
   *
   * Actors keep their position - places still gate content - but they no longer walk
   * between them. A save mid-journey would otherwise carry a dead `travel` object
   * forward through every future save, and withDefaults merges actors per field, so it
   * would never be cleaned up on its own. Anyone caught mid-walk simply arrives.
   */
  3: (raw) => {
    const actors = {
      ...(raw['actors'] as Record<string, Record<string, unknown>> | undefined),
    }
    for (const [id, actor] of Object.entries(actors)) {
      const travel = actor['travel'] as { to?: unknown } | null | undefined
      const rest = { ...actor }
      delete rest['travel']
      // Land them at the destination they had chosen, not back where they set off.
      if (travel && typeof travel.to === 'string') rest['at'] = travel.to
      actors[id] = rest
    }
    return { ...raw, version: 4, actors }
  },
  /**
   * 2 -> 3: the world became a graph and actors gained a position.
   *
   * withDefaults now also fills missing actor fields, so this is belt-and-braces -
   * but it states the intent explicitly: everyone comes back at the camp, which is
   * the one place always safe to stand, rather than wherever a default happens to be.
   */
  2: (raw) => {
    const actors = {
      ...(raw['actors'] as Record<string, Record<string, unknown>> | undefined),
    }
    for (const [id, actor] of Object.entries(actors)) {
      actors[id] = { ...actor, at: actor['at'] ?? 'the_hollow' }
    }
    return { ...raw, version: 3, actors }
  },
  1: (raw) => {
    const skills = { ...(raw['skills'] as Record<string, number> | undefined) }
    for (const [from, to] of Object.entries(RENAMED_COMBAT_SKILLS_V1)) {
      if (!(from in skills)) continue
      skills[to] = skills[from] ?? 0
      delete skills[from]
    }
    return { ...raw, version: 2, skills }
  },
}

/**
 * Fill in anything a save is missing from a fresh game.
 *
 * This covers purely additive changes - a new skill, a new state field - without
 * needing a migration for each one. Migrations are for changes that *reshape* or
 * reinterpret existing data.
 */
function withDefaults(raw: Record<string, unknown>): GameState {
  const base = newGame()
  const merged = { ...base, ...raw } as GameState

  merged.skills = { ...base.skills, ...(raw['skills'] as object | undefined) }

  // Actors are merged *per field*, not wholesale. Spreading whole actor objects
  // leaves any field added later missing on old saves - which is exactly how a save
  // once loaded with no map position at all, leaving the mech nowhere and every
  // destination unreachable. Migrations handle reshaping; this handles new fields.
  const rawActors = raw['actors'] as Record<string, object> | undefined
  merged.actors = { ...base.actors }
  for (const id of Object.keys(base.actors) as ActorId[]) {
    merged.actors[id] = { ...base.actors[id], ...(rawActors?.[id] ?? {}) }
  }
  merged.combat = { ...base.combat, ...(raw['combat'] as object | undefined) }
  // An attack style the game does not have would route xp nowhere and lose it silently,
  // which is the quietest possible way to break a save. Fall back rather than trust it.
  if (!getCombatStyle(merged.combat.style)) merged.combat.style = base.combat.style
  merged.bank = { ...(raw['bank'] as object | undefined) }
  merged.equipment = { ...(raw['equipment'] as object | undefined) }
  merged.defeated = { ...(raw['defeated'] as object | undefined) }
  merged.visited = Array.isArray(raw['visited']) ? (raw['visited'] as string[]) : base.visited
  // A malformed boost must never leave work permanently accelerated.
  const rawBoost = raw['boost'] as {
    multiplier?: unknown
    secondsRemaining?: unknown
  } | null
  merged.boost =
    rawBoost &&
    typeof rawBoost.multiplier === 'number' &&
    typeof rawBoost.secondsRemaining === 'number' &&
    rawBoost.secondsRemaining > 0
      ? (rawBoost as GameState['boost'])
      : null
  const rawStory = raw['story'] as { pending?: unknown; seen?: unknown } | undefined
  merged.story = {
    pending: Array.isArray(rawStory?.pending) ? (rawStory.pending as string[]) : [],
    seen: Array.isArray(rawStory?.seen) ? (rawStory.seen as string[]) : [],
  }

  // Guard against a hand-edited or corrupted save producing NaN, which would
  // silently poison every number downstream of it.
  if (!Number.isFinite(merged.elapsed)) merged.elapsed = 0
  if (!Number.isFinite(merged.rngSeed)) merged.rngSeed = base.rngSeed
  if (!Number.isFinite(merged.savedAt)) merged.savedAt = 0

  return merged
}

/** Serialise, stamping the wall-clock time so offline progress can be worked out. */
export function serialize(state: GameState, nowMs: number): string {
  return JSON.stringify({ ...state, version: SAVE_VERSION, savedAt: nowMs })
}

/** Parse, migrate and validate. Never throws. */
export function deserialize(
  json: string,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): LoadResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Save file is not valid JSON.' }
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Save file is not a game state.' }
  }

  const working = raw as Record<string, unknown>
  const startVersion = working['version']
  if (typeof startVersion !== 'number' || !Number.isInteger(startVersion) || startVersion < 1) {
    return { ok: false, error: 'Save file has no usable version number.' }
  }

  if (startVersion > SAVE_VERSION) {
    // Almost always a save from a newer build. Refuse rather than mangle it.
    return {
      ok: false,
      error: `Save is from a newer version of the game (v, this build reads v).`,
    }
  }

  const migrated = runMigrations(working, SAVE_VERSION, migrations)
  if (!migrated.ok) return { ok: false, error: migrated.error }

  const state = withDefaults(migrated.raw)
  state.version = SAVE_VERSION
  return {
    ok: true,
    state,
    migratedFrom: startVersion === SAVE_VERSION ? null : startVersion,
  }
}

export type MigrationResult =
  { ok: true; raw: Record<string, unknown> } | { ok: false; error: string }

/**
 * Walk a save forward from its own version to `target`, one migration at a time.
 *
 * Split out from `deserialize` so the chain can be exercised directly. There are no
 * real migrations yet, and without this seam the mechanism could not be tested at all
 * until the day it was first needed - which is the worst possible day to discover a
 * bug in it.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  target: number,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): MigrationResult {
  let working = raw
  const initialVersion = working['version']
  if (typeof initialVersion !== 'number') {
    return { ok: false, error: 'Save file has no usable version number.' }
  }
  let version: number = initialVersion

  while (version < target) {
    const migration = migrations[version]
    if (!migration) {
      return { ok: false, error: `No migration from save version ${version}.` }
    }
    working = migration(working)
    const next = working['version']
    if (typeof next !== 'number' || next <= version) {
      return {
        ok: false,
        error: `Migration from version ${version} did not advance the version.`,
      }
    }
    version = next
  }

  return { ok: true, raw: working }
}
