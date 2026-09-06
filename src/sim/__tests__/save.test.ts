import { describe, it, expect } from 'vitest'
import { deserialize, runMigrations, serialize, type Migration } from '../save'
import { newGame, SAVE_VERSION, setActivity } from '../state'
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
    expect(Object.keys(result.state.skills).sort()).toEqual([
      'attack',
      'defence',
      'fabrication',
      'hitpoints',
      'refining',
      'scavenging',
      'strength',
    ])
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
