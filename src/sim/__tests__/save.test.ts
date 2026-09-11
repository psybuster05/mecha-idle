import { describe, it, expect } from 'vitest'
import { deserialize, runMigrations, serialize, type Migration } from '../save'
import { ALL_SKILLS, newGame, SAVE_VERSION, setActivity } from '../state'
import { tick } from '../tick'

function populated() {
  let state = newGame(555)
  setActivity(state, 'mech', { kind: 'skill', skill: 'scavenging', action: 'roadside_wrecks' })
  state = tick(state, 300)
  state.equipment.weapon = 'weapon_rivet'
  return state
}

describe('save round trip', () => {
  it('restores an identical state', () => {
    const state = populated()
    const result = deserialize(serialize(state, 1_700_000_000_000))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state).toEqual({ ...state, savedAt: 1_700_000_000_000 })
    expect(result.migratedFrom).toBeNull()
  })

  it('stamps the wall clock so offline progress can be worked out', () => {
    const parsed = JSON.parse(serialize(newGame(), 12345))
    expect(parsed.savedAt).toBe(12345)
    expect(parsed.version).toBe(SAVE_VERSION)
  })
})

describe('save rejection', () => {
  it('refuses input that is not a game state', () => {
    for (const bad of ['not json', '[]', 'null', '"a string"', '42']) {
      expect(deserialize(bad).ok).toBe(false)
    }
  })

  it('refuses a save with no usable version', () => {
    expect(deserialize(JSON.stringify({ skills: {} })).ok).toBe(false)
    expect(deserialize(JSON.stringify({ version: 'one' })).ok).toBe(false)
    expect(deserialize(JSON.stringify({ version: 0 })).ok).toBe(false)
  })

  it('refuses a save from a newer build rather than mangling it', () => {
    const result = deserialize(JSON.stringify({ ...newGame(), version: SAVE_VERSION + 5 }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('newer version')
  })
})

/**
 * There are no real migrations yet - version 1 is the first shape. The mechanism is
 * tested with injected migrations anyway, because the first time it is needed for
 * real it will be needed urgently and on live saves.
 */
describe('save migration mechanism', () => {
  // Version 1 is the first shape, so there are no real migrations yet. runMigrations
  // is exercised directly with invented versions - the mechanism has to be known-good
  // before the day it is first needed on live saves.
  const v1 = () => ({ version: 1, bank: {} }) as Record<string, unknown>

  it('runs a chain of migrations up to the target version', () => {
    const steps: number[] = []
    const migrations: Record<number, Migration> = {
      1: (raw) => {
        steps.push(1)
        return { ...raw, version: 2, bank: { scrap_steel: 7 } }
      },
      2: (raw) => {
        steps.push(2)
        return { ...raw, version: 3 }
      },
    }

    const result = runMigrations(v1(), 3, migrations)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(steps).toEqual([1, 2])
    expect(result.raw['version']).toBe(3)
    expect(result.raw['bank']).toEqual({ scrap_steel: 7 })
  })

  it('does nothing when the save is already current', () => {
    const result = runMigrations(v1(), 1, {})
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.raw['version']).toBe(1)
  })

  it('reports a gap in the chain instead of loading a broken state', () => {
    const result = runMigrations(v1(), 2, {})
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('No migration')
  })

  it('refuses a migration that fails to advance the version', () => {
    const migrations: Record<number, Migration> = { 1: (raw) => raw } // forgot to bump
    const result = runMigrations(v1(), 2, migrations)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('did not advance')
  })

  it('is wired into deserialize, which reports what it migrated from', () => {
    const result = deserialize(JSON.stringify(newGame()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.migratedFrom).toBeNull()
  })
})

describe('save repair', () => {
  it('fills in fields a save predates, without needing a migration', () => {
    // Simulates a save written before a skill existed. Purely additive changes
    // should not require a migration.
    const partial = { version: SAVE_VERSION, skills: { scavenging: 400 } }
    const result = deserialize(JSON.stringify(partial))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.skills.scavenging).toBe(400)
    expect(result.state.skills.fabrication).toBe(0)
    expect(result.state.actors.mech.unlocked).toBe(true)
    expect(result.state.bank).toEqual({})
  })

  it('repairs non-finite numbers rather than poisoning the sim', () => {
    const corrupt = { version: SAVE_VERSION, elapsed: null, rngSeed: 'x', savedAt: undefined }
    const result = deserialize(JSON.stringify(corrupt))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Number.isFinite(result.state.elapsed)).toBe(true)
    expect(Number.isFinite(result.state.rngSeed)).toBe(true)
    expect(Number.isFinite(result.state.savedAt)).toBe(true)
  })
})

/**
 * The first real migration: combat skills were renamed from mecha jargon
 * (targeting/servos/plating/structure) to the standard RPG terms
 * (attack/strength/defence/hitpoints) that players already know.
 */
describe('migration v1 -> v2: combat skill rename', () => {
  const v1Save = (skills: Record<string, number>) =>
    JSON.stringify({ ...newGame(), version: 1, skills })

  it('carries combat xp across to the new skill names', () => {
    const result = deserialize(
      v1Save({ targeting: 1000, servos: 2000, plating: 3000, structure: 4000, scavenging: 500 }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.skills.attack).toBe(1000)
    expect(result.state.skills.strength).toBe(2000)
    expect(result.state.skills.defence).toBe(3000)
    expect(result.state.skills.hitpoints).toBe(4000)
    expect(result.state.skills.scavenging).toBe(500)
    expect(result.migratedFrom).toBe(1)
  })

  it('leaves no trace of the old skill ids', () => {
    const result = deserialize(v1Save({ targeting: 1000 }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.state.skills).sort()).toEqual([...ALL_SKILLS].sort())
  })

  it('is a no-op on a save that never had the old names', () => {
    const result = deserialize(v1Save({ scavenging: 700 }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.skills.scavenging).toBe(700)
    expect(result.state.skills.attack).toBe(0)
  })

  it('would have silently destroyed that xp without the migration', () => {
    // Guards the reason this migration exists: withDefaults fills unknown keys with
    // zero, so a rename without a migration loses every combat level earned.
    const noMigrations = deserialize(v1Save({ targeting: 1000 }), {})
    expect(noMigrations.ok).toBe(false)
  })
})

/**
 * Regression: a save once loaded with the mech in no location at all.
 *
 * serialize() stamps the current version onto whatever state it holds, so a
 * mid-development save was written already labelled v3 while still carrying v2-shaped
 * actors. The migration therefore never ran, and withDefaults merged actors one level
 * too shallow to repair it - the mech was "Nowhere" and every destination unreachable.
 */
describe('save repair: fields added inside an actor', () => {
  it('fills actor fields a save predates, even at the current version', () => {
    const stale = {
      ...newGame(),
      version: SAVE_VERSION, // already current, so no migration will run
      actors: {
        mech: { unlocked: true, activity: null, progress: 0, stoppedReason: null },
        crawler: { unlocked: false, activity: null, progress: 0, stoppedReason: null },
      },
    }

    const result = deserialize(JSON.stringify(stale))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.actors.mech.at).toBe('the_hollow')
    expect(result.state.actors.crawler.at).toBe('the_hollow')
  })

  it('still prefers what the save actually recorded', () => {
    const saved = {
      ...newGame(),
      version: SAVE_VERSION,
      actors: {
        mech: { unlocked: true, activity: null, progress: 0, stoppedReason: null, at: 'graveyard' },
        crawler: { unlocked: false, activity: null, progress: 0, stoppedReason: null, at: 'the_hollow' },
      },
    }

    const result = deserialize(JSON.stringify(saved))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.actors.mech.at).toBe('graveyard')
  })

  it('migrates a genuine v2 save to the camp', () => {
    const v2 = {
      ...newGame(),
      version: 2,
      actors: {
        mech: { unlocked: true, activity: null, progress: 0, stoppedReason: null },
        crawler: { unlocked: false, activity: null, progress: 0, stoppedReason: null },
      },
    }
    const result = deserialize(JSON.stringify(v2))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.actors.mech.at).toBe('the_hollow')
    expect(result.migratedFrom).toBe(2)
  })
})

describe('migration 4 -> 5: Ranged', () => {
  it('seeds Ranged from the better melee skill', () => {
    const old = { ...newGame(), version: 4 } as Record<string, unknown>
    old['skills'] = { ...(old['skills'] as object), attack: 5000, strength: 9000 }
    delete (old['skills'] as Record<string, number>)['ranged']

    const result = deserialize(JSON.stringify(old))
    expect(result.ok && result.state.skills.ranged).toBe(9000)
  })

  it('seeds it even when a stray zero is already present', () => {
    // A guard on "is it already a number" skipped exactly this case.
    const old = { ...newGame(), version: 4 } as Record<string, unknown>
    old['skills'] = { ...(old['skills'] as object), attack: 5000, strength: 0, ranged: 0 }

    const result = deserialize(JSON.stringify(old))
    expect(result.ok && result.state.skills.ranged).toBe(5000)
  })
})

/**
 * Removing a skill is a migration, not a deletion.
 *
 * Skill ids live in save files, so dropping one leaves a key behind that withDefaults
 * would spread over the defaults and carry forward into every future save. Anyone who
 * trained Cartography keeps what it produced - that is already in the bank - but the
 * xp itself has nowhere honest to go.
 */
describe('cartography was removed', () => {
  it('strips the key even from a save already stamped with the current version', () => {
    // The case that actually bit. A build still carrying the skill wrote a save at the
    // *new* version number, so the migration never ran on it - and withDefaults used to
    // spread the saved skills over the defaults, which preserves keys the game no longer
    // knows about. The key then survived every future save. Copying key by key from
    // ALL_SKILLS is what makes that unrepresentable rather than merely migrated once.
    const stray = { ...newGame(), version: SAVE_VERSION } as Record<string, unknown>
    stray['skills'] = { ...(stray['skills'] as object), cartography: 0 }

    const result = deserialize(JSON.stringify(stray))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.migratedFrom).toBeNull()
    expect('cartography' in result.state.skills).toBe(false)
  })

  it('ignores a skill value that is not a finite number', () => {
    const junk = { ...newGame(), version: SAVE_VERSION } as Record<string, unknown>
    junk['skills'] = { ...(junk['skills'] as object), scavenging: 'lots' }

    const result = deserialize(JSON.stringify(junk))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.skills.scavenging).toBe(0)
  })

  it('drops its xp and leaves every other skill alone', () => {
    const old = { ...newGame(), version: 5 } as Record<string, unknown>
    old['skills'] = { ...(old['skills'] as object), cartography: 1_234_567, scavenging: 5000 }

    const result = deserialize(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.migratedFrom).toBe(5)
    expect('cartography' in result.state.skills).toBe(false)
    expect(result.state.skills.scavenging).toBe(5000)
  })
})

/**
 * The crawler was cut after playtest feedback. A save that had one must lose nothing:
 * whatever it made is already in the bank, and every Traction Core - in the bank, or the
 * one wired into a running crawler - turns back into the steel and wire it was made of.
 */
describe('migration 7 -> 8: the crawler was cut', () => {
  const v7 = (crawler: object, bank: Record<string, number>) => {
    const old = { ...newGame(), version: 7 } as Record<string, unknown>
    const actors = old['actors'] as Record<string, object>
    old['actors'] = { ...actors, crawler: { ...actors['crawler'], ...crawler } }
    old['bank'] = bank
    return deserialize(JSON.stringify(old))
  }

  it('puts a running crawler to sleep and refunds the core it was built from', () => {
    const result = v7(
      { unlocked: true, activity: { kind: 'skill', skill: 'refining', action: 'smelt_steel' }, progress: 2 },
      { steel_ingot: 10, wire_spool: 1, scrap_steel: 500 },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.migratedFrom).toBe(7)
    expect(result.state.actors.crawler.unlocked).toBe(false)
    expect(result.state.actors.crawler.activity).toBeNull()
    expect(result.state.actors.crawler.progress).toBe(0)
    expect(result.state.bank['steel_ingot']).toBe(10 + 6)
    expect(result.state.bank['wire_spool']).toBe(1 + 3)
    // What it made stays put.
    expect(result.state.bank['scrap_steel']).toBe(500)
  })

  it('refunds every unbuilt core too, and leaves none behind', () => {
    const result = v7({ unlocked: true }, { crawler_core: 2 })
    expect(result.ok && result.state.bank['crawler_core']).toBeUndefined()
    // Two in the bank plus the one that was wired in.
    expect(result.ok && result.state.bank['steel_ingot']).toBe(18)
    expect(result.ok && result.state.bank['wire_spool']).toBe(9)
  })

  it('catches a save stamped 8 that never went through the migration', () => {
    // Seen for real: a dev server hot-reloaded the new code into a page still holding the
    // old game, and saved it - version 8, crawler running, 2,500 cores in the bank. The
    // migration is keyed on version and would never have looked at it.
    const stale = { ...newGame(), version: 8 } as Record<string, unknown>
    const actors = stale['actors'] as Record<string, object>
    stale['actors'] = { ...actors, crawler: { ...actors['crawler'], unlocked: true } }
    stale['bank'] = { crawler_core: 2500, steel_ingot: 2500, wire_spool: 2500 }

    const result = deserialize(JSON.stringify(stale))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.migratedFrom).toBeNull()
    expect(result.state.actors.crawler.unlocked).toBe(false)
    expect(result.state.bank['crawler_core']).toBeUndefined()
    expect(result.state.bank['steel_ingot']).toBe(2500 + 6 * 2501)
    expect(result.state.bank['wire_spool']).toBe(2500 + 3 * 2501)

    // And a second load changes nothing: there is nothing left to refund.
    const again = deserialize(serialize(result.state, 1))
    expect(again.ok && again.state.bank).toEqual(result.state.bank)
  })

  it('changes nothing for a save that never built one', () => {
    const result = v7({}, { scrap_steel: 5 })
    expect(result.ok && result.state.bank).toEqual({ scrap_steel: 5 })
    expect(result.ok && result.state.actors.crawler.unlocked).toBe(false)
  })
})
