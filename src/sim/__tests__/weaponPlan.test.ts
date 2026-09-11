import { describe, it, expect } from 'vitest'
import { getEnemy } from '../../content'
import { equipItem } from '../equipment'
import { setWeaponPlan, startCombat } from '../intents'
import { buildPresetById } from '../presets'
import { deserialize, serialize } from '../save'
import { derivedStats } from '../stats'
import { newGame, COMBAT_SKILLS, type GameState } from '../state'
import { tick } from '../tick'
import { fightingAs, OPENING, ownedWeapons, plannedWeapon } from '../weaponPlan'
import { xpForLevel } from '../xp'

/**
 * Weapon plans: switching between a boss's phases.
 *
 * The plan changes what the fight *sees*, never what is equipped, and which weapon is in
 * use is derived from the boss's HP. These hold the three things that would make it a
 * liability rather than a feature: switching at the wrong moment, leaving the mech
 * empty-handed, and a big offline step disagreeing with many small ones.
 */

/** Fighting the Overseer at level 70: a kinetic weapon fitted, an EMP one in the bank. */
function atOverseer(hp?: number): GameState {
  const s = newGame(11)
  for (const k of COMBAT_SKILLS) s.skills[k] = xpForLevel(70)
  s.bank['weapon_rivet'] = 1 // kinetic
  equipItem(s, 'weapon_rivet')
  s.bank['weapon_pulse'] = 1 // a spare to switch to
  const started = startCombat(s, 'rustbelt', 'overseer')
  if (hp !== undefined) {
    started.combat.enemyId = 'overseer'
    started.combat.enemyHp = hp
  }
  return started
}

const overseer = () => getEnemy('overseer')!
const bulwarkHp = () => overseer().maxHp * 0.5 // below its 60% threshold, above 25%

describe('which weapon the fight sees', () => {
  it('is the fitted one when there is no plan', () => {
    const s = atOverseer(bulwarkHp())
    expect(fightingAs(s)).toBe(s)
    expect(plannedWeapon(s)).toBeNull()
  })

  it('is the planned one in the planned phase, and only there', () => {
    let s = atOverseer(bulwarkHp())
    s = setWeaponPlan(s, 'overseer', 'Bulwark', 'weapon_pulse')
    s.combat.enemyId = 'overseer'
    s.combat.enemyHp = bulwarkHp()
    expect(plannedWeapon(s)).toBe('weapon_pulse')
    expect(derivedStats(fightingAs(s)).damageType).toBe(derivedStats({ ...s, equipment: { ...s.equipment, weapon: 'weapon_pulse' } }).damageType)

    // The opening and Overload are not covered, so the fitted weapon stays in hand.
    s.combat.enemyHp = overseer().maxHp
    expect(plannedWeapon(s)).toBeNull()
    s.combat.enemyHp = overseer().maxHp * 0.1
    expect(plannedWeapon(s)).toBeNull()
  })

  it('never moves the equipped weapon or touches the bank', () => {
    const s = setWeaponPlan(atOverseer(bulwarkHp()), 'overseer', 'Bulwark', 'weapon_pulse')
    s.combat.enemyId = 'overseer'
    s.combat.enemyHp = bulwarkHp()
    const seen = fightingAs(s)
    expect(seen.equipment.weapon).toBe('weapon_pulse')
    expect(s.equipment.weapon).toBe('weapon_rivet')
    expect(s.bank['weapon_pulse']).toBe(1)
  })

  it('falls back to the fitted weapon when the planned one is not owned', () => {
    // Salvaged, or never built. A plan can only add a switch; it can never leave the mech
    // empty-handed.
    const s = setWeaponPlan(atOverseer(bulwarkHp()), 'overseer', 'Bulwark', 'weapon_lance')
    s.combat.enemyId = 'overseer'
    s.combat.enemyHp = bulwarkHp()
    expect(plannedWeapon(s)).toBeNull()
    expect(fightingAs(s)).toBe(s)
  })

  it('does nothing against an enemy that is not a boss', () => {
    const s = setWeaponPlan(atOverseer(), 'overseer', OPENING, 'weapon_pulse')
    s.combat.enemyId = 'reclaimer'
    s.combat.enemyHp = 10
    expect(plannedWeapon(s)).toBeNull()
  })
})

describe('setting a plan', () => {
  it('only accepts a real boss, a key it has, and a weapon', () => {
    const s = atOverseer()
    expect(setWeaponPlan(s, 'reclaimer', OPENING, 'weapon_pulse')).toBe(s)
    expect(setWeaponPlan(s, 'overseer', 'Not A Phase', 'weapon_pulse')).toBe(s)
    expect(setWeaponPlan(s, 'overseer', 'Bulwark', 'frame_bulwark')).toBe(s)
    expect(setWeaponPlan(s, 'overseer', 'Bulwark', 'weapon_pulse').weaponPlans['overseer']).toEqual({ Bulwark: 'weapon_pulse' })
  })

  it('clears to nothing, so "no plan" has one representation', () => {
    let s = setWeaponPlan(atOverseer(), 'overseer', 'Bulwark', 'weapon_pulse')
    s = setWeaponPlan(s, 'overseer', 'Bulwark', null)
    expect(s.weaponPlans['overseer']).toBeUndefined()
  })

  it('survives a save, and a corrupted plan loses switches rather than breaking', () => {
    const s = setWeaponPlan(atOverseer(), 'overseer', 'Bulwark', 'weapon_pulse')
    const loaded = deserialize(serialize(s, 1))
    expect(loaded.ok && loaded.state.weaponPlans).toEqual({ overseer: { Bulwark: 'weapon_pulse' } })

    const raw = JSON.parse(serialize(s, 1))
    raw.weaponPlans = { overseer: { Bulwark: 7, Overload: 'weapon_pulse' }, census: 'nonsense' }
    const repaired = deserialize(JSON.stringify(raw))
    expect(repaired.ok && repaired.state.weaponPlans).toEqual({ overseer: { Overload: 'weapon_pulse' } })

    delete raw.weaponPlans
    const older = deserialize(JSON.stringify(raw))
    expect(older.ok && older.state.weaponPlans).toEqual({})
  })
})

describe('switching mid-fight', () => {
  const planned = () => {
    let s = atOverseer()
    s = setWeaponPlan(s, 'overseer', 'Bulwark', 'weapon_pulse')
    return s
  }

  it('gives the same fight in one big step as in many small ones', () => {
    // The headline offline guarantee. The switch is taken at the swing that crosses the
    // threshold, so it must not matter whether that swing falls inside a frame or a day.
    let many = planned()
    for (let i = 0; i < 1200; i++) many = tick(many, 0.5)
    const one = tick(planned(), 600)
    expect(one.defeated).toEqual(many.defeated)
    expect(one.skills).toEqual(many.skills)
    expect(one.combat.enemyHp).toBeCloseTo(many.combat.enemyHp, 6)
    expect(one.combat.hp).toBeCloseTo(many.combat.hp, 6)
    expect(one.rngSeed).toBe(many.rngSeed)
  })

  it('changes the outcome of a fight the plan is written for', () => {
    // Bulwark walls kinetic at x0.25 and opens EMP at x1.5. Walking in with a kinetic
    // weapon and switching to an EMP one for that phase has to beat staying kinetic
    // throughout - the design's own promise, "bring two and you win".
    const kills = (s: GameState) => {
      let x = s
      for (let i = 0; i < 1200; i++) x = tick(x, 0.5)
      return x.defeated['overseer'] ?? 0
    }
    expect(kills(planned())).toBeGreaterThan(kills(atOverseer()))
  })
})

describe('the pre-made saves', () => {
  it('carry spare weapons, so a plan has something to switch to', () => {
    for (const id of ['mid', 'end']) {
      const s = buildPresetById(id, 1)!
      expect(ownedWeapons(s).length, `${id} has nothing to switch to`).toBeGreaterThan(1)
    }
  })

  it('starts with no plans - writing them is the tester’s decision', () => {
    for (const id of ['mid', 'end']) {
      expect(buildPresetById(id, 1)!.weaponPlans).toEqual({})
    }
  })
})
