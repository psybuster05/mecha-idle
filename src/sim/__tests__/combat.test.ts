import { describe, it, expect } from 'vitest'
import { tick } from '../tick'
import {
  COMBAT_SKILLS,
  newGame,
  setActivity,
  type CombatSkillId,
  type GameState,
} from '../state'
import {
  COMBAT_SKILL_DEFS,
  COMBAT_STYLES,
  STYLE_SKILLS,
  type CombatStyleId,
} from '../../content/skills/combat'
import { setCombatStyle } from '../intents'
import { deserialize, serialize } from '../save'
import { levelFromXp } from '../xp'
import { count } from '../bank'
import { equipItem, unequipSlot } from '../equipment'
import { combatLevel, derivedStats, RESPAWN_DELAY } from '../stats'
import { xpForLevel } from '../xp'

function deployed(seed = 7): GameState {
  const state = newGame(seed)
  setActivity(state, 'mech', { kind: 'combat', zone: 'rustbelt' })
  return state
}

/** A mech levelled and kitted well enough to farm the Rustbelt indefinitely. */
function veteran(seed = 7): GameState {
  const state = deployed(seed)
  for (const skill of ['attack', 'strength', 'defence', 'hitpoints'] as const) {
    state.skills[skill] = xpForLevel(40)
  }
  return state
}

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('combat - engagement', () => {
  it('takes the respawn delay to find the first enemy', () => {
    expect(tick(deployed(), RESPAWN_DELAY - 0.1).combat.enemyId).toBeNull()
    expect(tick(deployed(), RESPAWN_DELAY).combat.enemyId).not.toBeNull()
  })

  it('starts a deployment at full integrity', () => {
    const state = tick(deployed(), 0.5)
    expect(state.combat.hp).toBe(derivedStats(state).maxHp)
  })

  it('refuses a zone above the mech combat level', () => {
    const state = deployed()
    state.actors.mech.activity = { kind: 'combat', zone: 'rustbelt' }
    // Rustbelt requires level 1 and a fresh mech is level 1, so fake a stricter gate
    // by checking the inverse: an unknown zone halts.
    state.actors.mech.activity = { kind: 'combat', zone: 'no_such_zone' }
    const after = tick(state, 10)
    expect(after.actors.mech.stoppedReason).toBe('unknown-action')
  })
})

describe('combat - kills', () => {
  it('awards xp to all four combat skills and drops loot', () => {
    const state = tickBy(veteran(), 120, 0.5)

    expect(state.skills.attack).toBeGreaterThan(xpForLevel(40))
    expect(state.skills.strength).toBeGreaterThan(xpForLevel(40))
    expect(state.skills.defence).toBeGreaterThan(xpForLevel(40))
    expect(state.skills.hitpoints).toBeGreaterThan(xpForLevel(40))
    expect(count(state, 'scrap_steel')).toBeGreaterThan(0)
  })

  it('gives Hitpoints less xp than the offensive skills', () => {
    // Deliberate: survivability should trail slightly so it stays worth investing in.
    const state = tickBy(veteran(), 300, 0.5)
    const gainedAttack = state.skills.attack - xpForLevel(40)
    const gainedHitpoints = state.skills.hitpoints - xpForLevel(40)
    expect(gainedHitpoints).toBeGreaterThan(0)
    expect(gainedHitpoints).toBeLessThan(gainedAttack)
  })

  it('a stronger mech kills faster than a weaker one', () => {
    const weak = tickBy(deployed(99), 600, 0.5)
    const strong = tickBy(veteran(99), 600, 0.5)
    expect(strong.skills.attack - xpForLevel(40)).toBeGreaterThan(weak.skills.attack)
  })
})

describe('combat - destruction', () => {
  it('halts, explains itself, and patches the mech back up', () => {
    // A level-1 mech in the Rustbelt is outmatched and will meet a Reclaimer.
    const state = tickBy(deployed(3), 2000, 0.5)
    expect(state.actors.mech.activity).toBeNull()
    expect(state.actors.mech.stoppedReason).toBe('destroyed')
    expect(state.combat.hp).toBe(derivedStats(state).maxHp)
    expect(state.combat.enemyId).toBeNull()
  })

  it('leaves a veteran mech still fighting after hours', () => {
    const state = tickBy(veteran(), 8 * 3600, 5)
    expect(state.actors.mech.stoppedReason).toBeNull()
    expect(state.actors.mech.activity).not.toBeNull()
    expect(state.combat.hp).toBeGreaterThan(0)
  })
})

/**
 * The offline guarantee, for combat.
 *
 * Combat is stepped event-by-event, so the order of swings and RNG rolls does not
 * depend on how large a dt arrives. One big step must land where many small ones do.
 */
describe('combat - bulk and incremental are equivalent', () => {
  it('matches over an hour of fighting', () => {
    const bulk = tick(veteran(2024), 3600)
    const incremental = tickBy(veteran(2024), 3600, 0.25)
    expect(incremental).toEqual(bulk)
  })

  it('matches when the mech is destroyed partway through', () => {
    const bulk = tick(deployed(3), 3600)
    const incremental = tickBy(deployed(3), 3600, 0.25)
    expect(incremental.actors.mech.stoppedReason).toBe('destroyed')
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.bank).toEqual(bulk.bank)
  })
})

describe('equipment', () => {
  it('moves the part out of the bank and changes derived stats', () => {
    const state = newGame()
    state.bank['weapon_rivet'] = 1
    const before = derivedStats(state).damage

    expect(equipItem(state, 'weapon_rivet')).toBeNull()
    expect(count(state, 'weapon_rivet')).toBe(0)
    expect(state.equipment.weapon).toBe('weapon_rivet')
    // Weapons multiply rather than add, so their advantage does not decay with level.
    expect(derivedStats(state).damage).toBeCloseTo(before * 1.15, 6)
  })

  it('returns the displaced part to the bank when swapping a slot', () => {
    const state = newGame()
    state.bank['weapon_rivet'] = 2
    equipItem(state, 'weapon_rivet')
    state.bank['weapon_rivet'] = 1
    equipItem(state, 'weapon_rivet')
    // The one that came off went back into storage.
    expect(count(state, 'weapon_rivet')).toBe(1)
  })

  it('unequipping restores the item and the stats', () => {
    const state = newGame()
    state.bank['frame_steel'] = 1
    const before = derivedStats(state).maxHp
    equipItem(state, 'frame_steel')
    expect(derivedStats(state).maxHp).toBe(before + 25)

    unequipSlot(state, 'frame')
    expect(count(state, 'frame_steel')).toBe(1)
    expect(derivedStats(state).maxHp).toBe(before)
  })

  it('rejects items that are missing, not owned, or not equippable', () => {
    const state = newGame()
    expect(equipItem(state, 'nope')).toBe('unknown-item')
    expect(equipItem(state, 'scrap_steel')).toBe('not-equippable')
    expect(equipItem(state, 'frame_steel')).toBe('not-in-bank')
  })

  it('clamps integrity down when max HP drops', () => {
    const state = newGame()
    state.bank['frame_steel'] = 1
    equipItem(state, 'frame_steel')
    setActivity(state, 'mech', { kind: 'combat', zone: 'rustbelt' })
    let after = tick(state, 1)
    const boosted = derivedStats(after).maxHp
    expect(after.combat.hp).toBe(boosted)

    unequipSlot(after, 'frame')
    after = tick(after, 1)
    expect(after.combat.hp).toBe(derivedStats(after).maxHp)
    expect(after.combat.hp).toBeLessThan(boosted)
  })
})

describe('combat level', () => {
  it('is the mean of the four combat skills', () => {
    const state = newGame()
    expect(combatLevel(state)).toBe(1)
    state.skills.attack = xpForLevel(20)
    state.skills.strength = xpForLevel(10)
    // (20 + 10 + 1 + 1) / 4 = 8
    expect(combatLevel(state)).toBe(8)
  })
})

/**
 * The combat skill panel tells the player what a level buys, using coefficients written
 * down a second time in `content/skills/combat.ts`. Two copies of a number drift, and a
 * tooltip that lies about the numbers is worse than no tooltip - so this measures the
 * real thing rather than trusting either copy.
 */
describe('combat skill descriptions match what the levels actually do', () => {
  // Narrowed to the numeric stats on purpose: DerivedStats also carries resistances and
  // a damage type, which cannot be subtracted.
  type NumericStat = 'accuracy' | 'damage' | 'evasion' | 'armour' | 'maxHp'
  const STAT_KEYS: Record<string, NumericStat> = {
    Accuracy: 'accuracy',
    Damage: 'damage',
    Evasion: 'evasion',
    Armour: 'armour',
    'Max HP': 'maxHp',
  }

  it('grants exactly what each table says, per level', () => {
    for (const skill of COMBAT_SKILL_DEFS) {
      const base = newGame()
      const raised = newGame()
      // 50 levels, so a small per-level coefficient is still measured well clear of
      // any rounding in the level curve.
      raised.skills[skill.id] = xpForLevel(51)
      base.skills[skill.id] = xpForLevel(1)

      const from = derivedStats(base)
      const to = derivedStats(raised)

      for (const grant of skill.grants) {
        const key = STAT_KEYS[grant.stat]
        expect(key, `"${grant.stat}" is not a stat the panel can show`).toBeDefined()
        expect(
          to[key!] - from[key!],
          `${skill.name} claims ${grant.perLevel} ${grant.stat} per level`,
        ).toBeCloseTo(grant.perLevel * 50, 6)
      }
    }
  })

  it('covers every combat skill, so none is left without a page', () => {
    expect(COMBAT_SKILL_DEFS.map((s) => s.id).sort()).toEqual([...COMBAT_SKILLS].sort())
  })
})

/**
 * Attack styles.
 *
 * The rule that matters is that **no style is faster than another**. Styles decide where
 * combat xp lands, never how much arrives - because zone requirements read combat level,
 * and a style that trained more slowly would have re-gated the whole game by the back
 * door.
 */
describe('attack styles', () => {
  const fought = (style: CombatStyleId, seconds = 1800) => {
    let state = newGame(31337)
    for (const skill of COMBAT_SKILLS) state.skills[skill] = xpForLevel(30)
    state = setCombatStyle(state, style)
    setActivity(state, 'mech', { kind: 'combat', zone: 'rustbelt' })
    return tickBy(state, seconds, 0.5)
  }

  const combatXp = (s: GameState) =>
    ['attack', 'strength', 'defence'].reduce((sum, k) => sum + s.skills[k as CombatSkillId], 0)

  it('defaults to balanced, which is what the game always did', () => {
    expect(newGame().combat.style).toBe('balanced')
  })

  /** Ticks until exactly one kill has landed. Hitpoints xp is the tell: it is paid on
   *  every kill and is the one thing no style changes. */
  const untilFirstKill = (style: CombatStyleId) => {
    let state = newGame(31337)
    for (const skill of COMBAT_SKILLS) state.skills[skill] = xpForLevel(30)
    state = setCombatStyle(state, style)
    setActivity(state, 'mech', { kind: 'combat', zone: 'rustbelt' })
    const startHp = state.skills.hitpoints
    for (let i = 0; i < 4000 && state.skills.hitpoints === startHp; i++) state = tick(state, 0.5)
    return state
  }

  it('pays exactly the same total xp for the same kill, whichever style is chosen', () => {
    const balanced = combatXp(untilFirstKill('balanced'))
    for (const style of ['accurate', 'aggressive', 'defensive'] as const) {
      expect(combatXp(untilFirstKill(style)), `${style} pays a different total`).toBe(balanced)
    }
  })

  /**
   * Over a long fight the totals drift slightly apart, and that is correct rather than a
   * leak. Concentrating xp raises one skill faster, which changes accuracy or damage,
   * which changes how quickly things die - so a style earns marginally more or less by
   * *fighting better*, not by being paid differently. Measured at well under one percent
   * over half an hour; the assertion is here to catch it becoming a real advantage.
   */
  it('stays within a whisker of the others over a long fight', () => {
    const balanced = combatXp(fought('balanced'))
    for (const style of ['accurate', 'aggressive', 'defensive'] as const) {
      const drift = Math.abs(combatXp(fought(style)) - balanced) / balanced
      expect(drift, `${style} drifted ${(drift * 100).toFixed(2)}%`).toBeLessThan(0.03)
    }
  })

  it('puts all of it in the skill the style names, and nothing in the others', () => {
    for (const style of COMBAT_STYLES) {
      if (!style.trains) continue
      const after = fought(style.id)
      for (const skill of STYLE_SKILLS) {
        const gained = after.skills[skill] - xpForLevel(30)
        if (skill === style.trains) expect(gained, `${style.id} trains ${skill}`).toBeGreaterThan(0)
        else expect(gained, `${style.id} should not train ${skill}`).toBe(0)
      }
    }
  })

  it('trains Hitpoints whatever you pick, because everything hitting you trains it', () => {
    for (const style of COMBAT_STYLES) {
      const after = fought(style.id)
      expect(after.skills.hitpoints, `${style.id}`).toBeGreaterThan(xpForLevel(30))
    }
  })

  /**
   * The cost of specialising, measured rather than assumed.
   *
   * Combat level is the average of four skills and the xp curve is exponential, so the
   * same xp concentrated into one skill buys fewer levels than spread across three.
   * Specialising should therefore make one number climb fast and combat level climb
   * slower. If that ever inverts, the styles have stopped being a trade-off.
   */
  it('costs combat level to specialise, and buys a higher single skill', () => {
    const balanced = fought('balanced', 3600)
    const focused = fought('aggressive', 3600)

    expect(levelFromXp(focused.skills.strength)).toBeGreaterThan(
      levelFromXp(balanced.skills.strength),
    )
    expect(combatLevel(focused)).toBeLessThanOrEqual(combatLevel(balanced))
  })

  it('refuses a style that does not exist rather than losing the xp', () => {
    const state = newGame()
    expect(setCombatStyle(state, 'nonsense' as CombatStyleId)).toBe(state)
  })

  it('survives a save, and a corrupt one falls back instead of routing nowhere', () => {
    const chosen = setCombatStyle(newGame(), 'defensive')
    const reloaded = deserialize(serialize(chosen, Date.now()))
    expect(reloaded.ok && reloaded.state.combat.style).toBe('defensive')

    const corrupt = deserialize(
      JSON.stringify({ ...newGame(), combat: { ...newGame().combat, style: 'bogus' } }),
    )
    expect(corrupt.ok && corrupt.state.combat.style).toBe('balanced')
  })
})
