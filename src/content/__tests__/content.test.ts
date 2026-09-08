import { describe, it, expect } from 'vitest'
import { SKILLS, getItem, getSkill, itemName, ENEMIES, getEnemy, ZONES } from '../index'
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

/**
 * Salvaging is derived from Fabrication *and* Refining - stripping reverses one,
 * recycling the other - and these are the properties that derivation exists to
 * guarantee.
 *
 * The hand-written version covered 8 of 23 fabricable items and had quietly stopped
 * keeping up; the fifteen it missed were the whole late game. Deriving it makes that
 * class of drift unrepresentable, and these tests are what say so out loud.
 */
describe('salvaging', () => {
  const salv = getSkill('salvaging')!

  /** Every recipe that produces something, from either skill it reverses. */
  const recipes = [...getSkill('fabrication')!.actions, ...getSkill('refining')!.actions]
  const recipeFor = (item: string) => recipes.find((a) => a.outputs[0]!.item === item)

  it('can take apart everything that can be made', () => {
    const strippable = new Set(salv.actions.flatMap((a) => (a.inputs ?? []).map((i) => i.item)))
    for (const recipe of recipes) {
      const made = recipe.outputs[0]!.item
      expect(strippable.has(made), `${itemName(made)} can be made but not taken apart`).toBe(true)
    }
  })

  it('takes apart nothing that cannot be made, so no action is orphaned', () => {
    for (const action of salv.actions) {
      const target = action.inputs?.[0]?.item
      expect(target, `${action.name} consumes nothing`).toBeDefined()
      expect(recipeFor(target!), `${action.name} consumes something unmakeable`).toBeDefined()
    }
  })

  it('always returns less than went in, so a make-and-unmake loop is never a source', () => {
    // The rule that keeps this a sink. If a loop ever paid out, the fastest route to any
    // material would be to make something and immediately undo it.
    for (const action of salv.actions) {
      const recipe = recipeFor(action.inputs![0]!.item)!
      const spent = (recipe.inputs ?? []).reduce((n, i) => n + i.qty, 0)
      const back = action.outputs.reduce((n, o) => n + o.qty, 0)
      expect(back, `${action.name} returns ${back} of the ${spent} it cost`).toBeLessThan(spent)
    }
  })

  it('always returns something, so nothing here is a pure delete', () => {
    // Flooring each input to half can reach zero for a recipe made of single units.
    // There is none today; the fallback exists so adding one is not a silent trap.
    for (const action of salv.actions) {
      expect(action.outputs.length, `${action.name} returns nothing at all`).toBeGreaterThan(0)
      for (const out of action.outputs) expect(out.qty).toBeGreaterThan(0)
    }
  })

  it('unlocks at the level that made the thing', () => {
    for (const action of salv.actions) {
      const recipe = recipeFor(action.inputs![0]!.item)!
      expect(action.levelRequired, action.name).toBe(recipe.levelRequired)
    }
  })

  it('pays exactly the xp per second of the recipe it reverses', () => {
    // Rounding xp to a whole number broke this once: smelting pays 4 over 4s, and its
    // teardown rounded to 2 over 2.4s - a quarter worse per second than its level-mate,
    // which the pacing suite flagged as a trap action.
    for (const action of salv.actions) {
      const recipe = recipeFor(action.inputs![0]!.item)!
      expect(action.xp / action.duration, action.name).toBeCloseTo(recipe.xp / recipe.duration, 6)
    }
  })

  it('reverses both skills, not just one', () => {
    const verbs = new Set(salv.actions.map((a) => a.name.split(' ')[0]))
    expect(verbs).toEqual(new Set(['Strip', 'Recycle']))
  })
})
