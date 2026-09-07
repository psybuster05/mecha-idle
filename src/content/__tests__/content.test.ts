import { describe, it, expect } from 'vitest'
import { SKILLS, getItem, ENEMIES, getEnemy, ZONES } from '../index'
import { ITEMS } from '../items'
import { EQUIP_SLOTS } from '../../sim/state'

/**
 * Integrity checks over the content tables.
 *
 * In a data-driven game a mistyped item id is the single most common bug, and it
 * fails silently at runtime - the action just produces nothing. These tests turn
 * that whole class of mistake into an instant, obvious failure.
 */
describe('content integrity', () => {
  it('has no duplicate item ids', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only references items that exist', () => {
    for (const skill of SKILLS) {
      for (const action of skill.actions) {
        const referenced = [
          ...(action.inputs ?? []),
          ...action.outputs,
          ...(action.drops ?? []),
        ]
        for (const stack of referenced) {
          expect(
            getItem(stack.item),
            `${skill.id}:${action.id} references unknown item "${stack.item}"`,
          ).toBeDefined()
        }
      }
    }
  })

  it('has no duplicate action ids within a skill', () => {
    for (const skill of SKILLS) {
      const ids = skill.actions.map((a) => a.id)
      expect(new Set(ids).size, `${skill.id} has duplicate action ids`).toBe(ids.length)
    }
  })

  it('gives every action a sane duration, xp and level requirement', () => {
    for (const skill of SKILLS) {
      for (const action of skill.actions) {
        const where = `${skill.id}:${action.id}`
        expect(action.duration, `${where} duration`).toBeGreaterThan(0)
        expect(action.xp, `${where} xp`).toBeGreaterThan(0)
        expect(action.levelRequired, `${where} level`).toBeGreaterThanOrEqual(1)
        expect(action.levelRequired, `${where} level`).toBeLessThanOrEqual(99)
        expect(action.outputs.length, `${where} produces nothing`).toBeGreaterThan(0)
        for (const stack of [...(action.inputs ?? []), ...action.outputs]) {
          expect(stack.qty, `${where} quantity`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('keeps drop chances a real probability', () => {
    for (const skill of SKILLS) {
      for (const action of skill.actions) {
        for (const drop of action.drops ?? []) {
          expect(drop.chance).toBeGreaterThan(0)
          expect(drop.chance).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('starts every skill with something doable at level 1', () => {
    // File ordering used to be asserted here, but skills now carry more than one
    // content line - Rustbelt and Ship Graveyard actions deliberately share level
    // thresholds - so authoring order is style rather than correctness. What still
    // matters is that no skill opens with nothing to do.
    for (const skill of SKILLS) {
      const lowest = Math.min(...skill.actions.map((a) => a.levelRequired))
      expect(lowest, `${skill.id} has nothing available at level 1`).toBe(1)
    }
  })

  it('gives every equippable part a valid slot and some stats', () => {
    for (const item of ITEMS) {
      if (item.category !== 'part') continue
      expect(EQUIP_SLOTS, `${item.id} slot`).toContain(item.slot)
      expect(Object.keys(item.stats ?? {}).length, `${item.id} has no stats`).toBeGreaterThan(0)
    }
  })

  it('can eventually fill every equipment slot', () => {
    // If a slot has no craftable part, the player has a permanently empty slot and
    // that is almost certainly an oversight rather than a design choice.
    const craftable = new Set(
      SKILLS.flatMap((s) => s.actions).flatMap((a) => a.outputs.map((o) => o.item)),
    )
    for (const slot of EQUIP_SLOTS) {
      const filled = ITEMS.some((i) => i.slot === slot && craftable.has(i.id))
      expect(filled, `no craftable part for slot "${slot}"`).toBe(true)
    }
  })

  it('only lets enemies drop items that exist, with sane stats', () => {
    for (const enemy of ENEMIES) {
      for (const stack of [...(enemy.guaranteed ?? []), ...(enemy.drops ?? [])]) {
        expect(getItem(stack.item), `${enemy.id} drops unknown item "${stack.item}"`).toBeDefined()
        expect(stack.qty).toBeGreaterThan(0)
      }
      for (const drop of enemy.drops ?? []) {
        expect(drop.chance).toBeGreaterThan(0)
        expect(drop.chance).toBeLessThanOrEqual(1)
      }
      expect(enemy.maxHp, `${enemy.id} hp`).toBeGreaterThan(0)
      expect(enemy.attackInterval, `${enemy.id} attack interval`).toBeGreaterThan(0)
      expect(enemy.xp, `${enemy.id} xp`).toBeGreaterThan(0)
      // The hit formula divides by (accuracy + evasion).
      expect(enemy.accuracy + enemy.evasion, `${enemy.id} would divide by zero`).toBeGreaterThan(0)
    }
  })

  it('only lets zones reference enemies that exist', () => {
    for (const zone of ZONES) {
      expect(zone.enemies.length, `${zone.id} has no enemies`).toBeGreaterThan(0)
      for (const id of zone.enemies) {
        expect(getEnemy(id), `zone ${zone.id} references unknown enemy "${id}"`).toBeDefined()
      }
    }
  })
})

/**
 * Both combat branches need somewhere to go.
 *
 * Splitting weapons into melee and ranged created a way to strand a whole branch without
 * noticing: melee briefly had the Rivet Driver at fabrication 30 and then nothing until
 * the Breaching Lance at 75, which is most of the game with no upgrade. A branch with a
 * hole in its ladder is content nobody can use, the same failure the world-node test
 * catches for skill actions.
 */
describe('every combat branch has a weapon ladder', () => {
  const weaponTiers = () => {
    const fab = SKILLS.find((s) => s.id === 'fabrication')!
    const tiers: { level: number; classes: string[] }[] = []
    for (const action of fab.actions) {
      const made = action.outputs.map((o) => getItem(o.item)).filter((i) => i?.slot === 'weapon')
      if (!made.length) continue
      tiers.push({
        level: action.levelRequired,
        classes: made.map((i) => i!.combatClass ?? 'melee'),
      })
    }
    return tiers
  }

  it('offers each branch a weapon at the first tier that has any', () => {
    const tiers = weaponTiers().sort((a, b) => a.level - b.level)
    expect(tiers.length).toBeGreaterThan(0)
    const first = tiers[0]!
    for (const branch of ['melee', 'ranged'] as const) {
      expect(
        first.classes.some((c) => c === branch || c === 'any'),
        `${branch} has no weapon at fabrication ${first.level}, the first tier that makes one`,
      ).toBe(true)
    }
  })

  it('never leaves a branch more than one tier without an upgrade', () => {
    const tiers = weaponTiers().sort((a, b) => a.level - b.level)
    const levels = [...new Set(tiers.map((t) => t.level))]
    for (const branch of ['melee', 'ranged'] as const) {
      const usable = levels.filter((level) =>
        tiers.some((t) => t.level === level && t.classes.some((c) => c === branch || c === 'any')),
      )
      const gaps = levels.filter((l) => !usable.includes(l))
      expect(gaps, `${branch} has no weapon at fabrication ${gaps.join(', ')}`).toEqual([])
    }
  })
})
