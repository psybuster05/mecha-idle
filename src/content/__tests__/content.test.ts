import { describe, it, expect } from 'vitest'
import { SKILLS, getItem } from '../index'
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

  it('unlocks actions in ascending level order within each skill', () => {
    // Not strictly required by the engine, but a skill list that jumps around is a
    // content mistake far more often than it is intentional.
    for (const skill of SKILLS) {
      const levels = skill.actions.map((a) => a.levelRequired)
      expect(levels, `${skill.id} actions are out of order`).toEqual([...levels].sort((a, b) => a - b))
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
})
