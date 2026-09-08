import { describe, it, expect } from 'vitest'
import {
  CATEGORY_ICONS,
  ENEMY_SPRITES,
  FIGHT_ICON,
  MECH_ARMS,
  MECH_BASE,
  MECH_LEGS_HEAVY,
  MECH_LEGS_THRUSTER,
  SKILL_ICONS,
  SLOT_ICONS,
  WEAPON_SPRITES,
  enemySpriteKey,
  type Sprite,
} from '../sprites'
import { ENEMIES } from '../enemies'
import { ITEMS } from '../items'
import { ALL_SKILLS, DAMAGE_TYPES, EQUIP_SLOTS } from '../../sim/state'

const ALL: Record<string, Sprite> = {
  FIGHT_ICON,
  MECH_BASE,
  MECH_ARMS,
  MECH_LEGS_HEAVY,
  MECH_LEGS_THRUSTER,
  ...Object.fromEntries(Object.entries(WEAPON_SPRITES).map(([k, v]) => [`weapon:${k}`, v])),
  ...Object.fromEntries(Object.entries(ENEMY_SPRITES).map(([k, v]) => [`enemy:${k}`, v])),
  ...Object.fromEntries(Object.entries(SKILL_ICONS).map(([k, v]) => [`skill:${k}`, v])),
  ...Object.fromEntries(Object.entries(CATEGORY_ICONS).map(([k, v]) => [`category:${k}`, v])),
  ...Object.fromEntries(Object.entries(SLOT_ICONS).map(([k, v]) => [`slot:${k}`, v])),
}

/**
 * Sprite data integrity.
 *
 * A ragged row or an unmapped character draws nothing and fails silently - the same
 * class of bug as a mistyped item id, and just as invisible at runtime.
 */
describe('sprite data', () => {
  it('is rectangular', () => {
    for (const [name, sprite] of Object.entries(ALL)) {
      const width = sprite.rows[0]?.length ?? 0
      expect(width, `${name} has no rows`).toBeGreaterThan(0)
      for (const [index, row] of sprite.rows.entries()) {
        expect(row.length, `${name} row ${index} is ${row.length}, expected ${width}`).toBe(width)
      }
    }
  })

  it('is authored at the size CLAUDE.md fixes', () => {
    // 16x16 for mechs and enemies. Integer scaling only works from a known base.
    for (const [name, sprite] of Object.entries(ALL)) {
      expect(sprite.rows.length, `${name} height`).toBe(16)
      expect(sprite.rows[0]!.length, `${name} width`).toBe(16)
    }
  })

  it('only uses characters it has a colour for', () => {
    for (const [name, sprite] of Object.entries(ALL)) {
      for (const row of sprite.rows) {
        for (const char of row) {
          if (char === ' ') continue
          expect(sprite.palette[char], `${name} uses "${char}" with no colour`).toBeDefined()
        }
      }
    }
  })

  it('draws something', () => {
    for (const [name, sprite] of Object.entries(ALL)) {
      const painted = sprite.rows.join('').replace(/ /g, '').length
      expect(painted, `${name} is blank`).toBeGreaterThan(20)
    }
  })
})

describe('sprite coverage', () => {
  it('gives every enemy a sprite', () => {
    for (const enemy of ENEMIES) {
      const key = enemySpriteKey(enemy)
      expect(ENEMY_SPRITES[key], `${enemy.id} maps to missing sprite "${key}"`).toBeDefined()
    }
  })

  it('gives every boss the boss sprite', () => {
    for (const enemy of ENEMIES.filter((e) => e.isBoss)) {
      expect(enemySpriteKey(enemy), enemy.id).toBe('authority')
    }
  })

  it('gives every damage type a weapon sprite', () => {
    for (const type of DAMAGE_TYPES) {
      expect(WEAPON_SPRITES[type], `no weapon sprite for ${type}`).toBeDefined()
    }
  })

  it('uses more than one archetype across the roster', () => {
    // If everything collapsed to one sprite the classification would be pointless.
    const used = new Set(ENEMIES.map(enemySpriteKey))
    expect(used.size).toBeGreaterThan(2)
  })
})

/**
 * Icon coverage.
 *
 * A missing icon renders as a hole rather than an error, so the only way to know every
 * skill and every item has one is to enumerate them from the content tables themselves.
 * The same reasoning as the test that gives every enemy a sprite.
 */
describe('icons cover the content', () => {
  it('gives every skill an icon', () => {
    for (const skill of ALL_SKILLS) {
      expect(SKILL_ICONS[skill], `${skill} has no icon`).toBeDefined()
    }
  })

  it('gives every item category an icon, so all items are covered', () => {
    for (const item of ITEMS) {
      expect(CATEGORY_ICONS[item.category], `${item.id} is a "${item.category}" with no icon`)
        .toBeDefined()
    }
  })

  it('has no icon for a category that does not exist', () => {
    const used = new Set(ITEMS.map((item) => item.category))
    for (const key of Object.keys(CATEGORY_ICONS)) {
      expect(used.has(key as (typeof ITEMS)[number]['category']), `"${key}" icon is orphaned`).toBe(true)
    }
  })

  it('gives every equipment slot an icon', () => {
    // Every equippable item is category "part", so category icons would make all five
    // slots identical. The slot is what differs, and an empty one still has to say what
    // belongs in it.
    for (const slot of EQUIP_SLOTS) {
      expect(SLOT_ICONS[slot], `${slot} has no icon`).toBeDefined()
    }
  })
})
