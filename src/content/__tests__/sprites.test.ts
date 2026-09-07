import { describe, it, expect } from 'vitest'
import {
  ENEMY_SPRITES,
  MECH_ARMS,
  MECH_BASE,
  MECH_LEGS_HEAVY,
  MECH_LEGS_THRUSTER,
  WEAPON_SPRITES,
  enemySpriteKey,
  type Sprite,
} from '../sprites'
import { ENEMIES } from '../enemies'
import { DAMAGE_TYPES } from '../../sim/state'

const ALL: Record<string, Sprite> = {
  MECH_BASE,
  MECH_ARMS,
  MECH_LEGS_HEAVY,
  MECH_LEGS_THRUSTER,
  ...Object.fromEntries(Object.entries(WEAPON_SPRITES).map(([k, v]) => [`weapon:${k}`, v])),
  ...Object.fromEntries(Object.entries(ENEMY_SPRITES).map(([k, v]) => [`enemy:${k}`, v])),
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
