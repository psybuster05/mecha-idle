import { describe, it, expect } from 'vitest'
import { ENEMIES, SKILLS, getItem } from '../../content'
import { PRESETS } from '../../content/presets'
import { SLOT_IDS, slotKey, SAVE_KEY } from '../../platform/SaveAdapter'
import { buildPreset } from '../presets'
import { deserialize, serialize } from '../save'
import { nextInterrupt } from '../story'
import { isUnlocked } from '../tutorial'
import { EQUIP_SLOTS, type SkillId } from '../state'
import { levelFromXp } from '../xp'
import { ZONES } from '../../content'
import { nodesForZone } from '../../content/world'
import { isNodeOpen } from '../world'
import { combatLevel } from '../stats'
import { startCombat } from '../intents'
import { tick } from '../tick'

/**
 * The pre-made stages.
 *
 * A preset is state that nobody played into existence, which means every invariant the
 * game normally gets for free from having been played has to be asserted here instead.
 */

const NOW = 1_700_000_000_000

describe('every preset is a save the game can actually load', () => {
  for (const def of PRESETS) {
    it(`${def.id} survives a round trip through the real save pipeline`, () => {
      const built = buildPreset(def, NOW)
      const result = deserialize(serialize(built, NOW))
      expect(result.ok, result.ok ? '' : result.error).toBe(true)
      if (!result.ok) return
      // Not merely parseable - unchanged. A preset that needs repairing on load is a
      // preset that was built against a state shape the game no longer has.
      expect(result.state.skills).toEqual(built.skills)
      expect(result.state.equipment).toEqual(built.equipment)
      expect(result.state.defeated).toEqual(built.defeated)
    })

    it(`${def.id} names real bosses`, () => {
      for (const boss of def.defeated) {
        const enemy = ENEMIES.find((e) => e.id === boss)
        expect(enemy, `${boss} is not an enemy`).toBeDefined()
        expect(enemy?.isBoss, `${boss} is not a boss`).toBe(true)
      }
    })

    it(`${def.id} fits gear it could have made`, () => {
      const state = buildPreset(def, NOW)
      const fabrication = SKILLS.find((s) => s.id === 'fabrication')!
      for (const [slot, item] of Object.entries(state.equipment)) {
        const def_ = getItem(item)
        expect(def_, `${item} is not an item`).toBeDefined()
        expect(def_?.slot, `${item} does not go in ${slot}`).toBe(slot)

        const recipe = fabrication.actions.find((a) =>
          a.outputs.some((o) => o.item === item),
        )
        expect(recipe, `${item} is not fabricable`).toBeDefined()
        expect(
          recipe!.levelRequired,
          `${item} needs Fabrication ${recipe!.levelRequired}`,
        ).toBeLessThanOrEqual(def.levels.fabrication ?? 1)
      }
      // Every slot filled. A "best gear in the game" save with an empty reactor is the
      // kind of thing only a tester notices, and only after drawing the wrong conclusion.
      expect(Object.keys(state.equipment).sort()).toEqual([...EQUIP_SLOTS].sort())
    })

    it(`${def.id} arrives with nothing demanding to be read`, () => {
      // Everything already earned is already read. Otherwise the first frame queues a
      // beat per boss and per level passed, and a tester meets a stack of dialogs.
      const state = buildPreset(def, NOW)
      expect(nextInterrupt(state)).toBeNull()
      expect(state.story.pending).toEqual([])
      expect(state.story.seen.length).toBeGreaterThan(0)
    })

    it(`${def.id} opens the whole rail`, () => {
      const state = buildPreset(def, NOW)
      for (const what of ['scavenging', 'refining', 'fabrication', 'salvaging', 'crawler'] as const) {
        expect(isUnlocked(state, what), `${what} still locked`).toBe(true)
      }
      expect(state.actors.crawler.unlocked).toBe(true)
    })

    it(`${def.id} starts alive and at rest`, () => {
      const state = buildPreset(def, NOW)
      expect(state.combat.hp).toBeGreaterThan(0)
      expect(state.actors.mech.activity).toBeNull()
      // Stamped now, so opening a preset for the first time credits no offline progress.
      expect(state.savedAt).toBe(NOW)
    })
  }
})

describe('the stages are in order', () => {
  it('endgame is ahead of mid-game in every skill', () => {
    const mid = PRESETS.find((p) => p.id === 'mid')!
    const end = PRESETS.find((p) => p.id === 'end')!
    for (const skill of Object.keys(mid.levels) as SkillId[]) {
      expect(end.levels[skill] ?? 0, `${skill} goes backwards`).toBeGreaterThan(
        mid.levels[skill] ?? 0,
      )
    }
    expect(end.defeated.length).toBeGreaterThan(mid.defeated.length)
  })

  it('leaves the endgame a boss to fight', () => {
    // A save with every boss dead has nothing left to show. The point of being dropped
    // into the endgame is the last fight, not the credits.
    const end = PRESETS.find((p) => p.id === 'end')!
    const bosses = ENEMIES.filter((e) => e.isBoss)
    expect(end.defeated.length).toBe(bosses.length - 1)
  })

  it('builds the levels it says it does', () => {
    for (const def of PRESETS) {
      const state = buildPreset(def, NOW)
      for (const [skill, level] of Object.entries(def.levels)) {
        expect(levelFromXp(state.skills[skill as SkillId])).toBe(level)
      }
    }
  })
})

describe('slots do not collide', () => {
  it('gives every slot its own key, and leaves the played one where it was', () => {
    const keys = SLOT_IDS.map(slotKey)
    expect(new Set(keys).size).toBe(keys.length)
    // The whole migration: a save written before slots existed is already slot 'own'.
    expect(slotKey('own')).toBe(SAVE_KEY)
  })
})

describe('every preset can win the fight it stops in front of', () => {
  // Entering is not the same as winning. The Mid-game save passed "can enter" for a week
  // while beating Tower Actual on one seed in five - it fought with a ranged weapon on its
  // weakest skill - and a tester who tried the fight the blurb points at was destroyed.
  // Five seeds, every one a win: a single lucky seed is how that went unnoticed.
  for (const def of PRESETS) {
    it(`${def.id} beats its next boss on every seed`, () => {
      const next = ENEMIES.filter((e) => e.isBoss).find((e) => !def.defeated.includes(e.id))!
      const zone = ZONES.find((z) => z.enemies.includes(next.id))!
      for (const seed of [1, 2, 3, 4, 5]) {
        const base = buildPreset(def, NOW)
        base.rngSeed = seed
        let s = startCombat(base, zone.id, next.id)
        let won = false
        for (let i = 0; i < 1800 && !won; i++) {
          s = tick(s, 0.5)
          won = (s.defeated[next.id] ?? 0) > 0
          if (s.actors.mech.activity === null) break
        }
        expect(won, `${def.id} loses to ${next.name} on seed ${seed}`).toBe(true)
      }
    })
  }
})

describe('every preset can reach the fight it stops in front of', () => {
  // Each blurb promises a next boss. The two gates are independent - a node unlocked by
  // the last kill, and a combat level the zone asks for - so passing one says nothing
  // about the other. Endgame shipped at combat level 90 against a room that wants 95:
  // a save promising a fight it could not enter.
  for (const def of PRESETS) {
    it(`${def.id} can get into its next boss's zone`, () => {
      const state = buildPreset(def, NOW)
      const next = ENEMIES.filter((e) => e.isBoss).find((e) => !def.defeated.includes(e.id))!
      const zone = ZONES.find((z) => z.enemies.includes(next.id))!

      const open = nodesForZone(zone.id).filter((node) => isNodeOpen(state, node.id))
      expect(open.length, `no open node offers ${zone.name}`).toBeGreaterThan(0)
      expect(
        combatLevel(state),
        `${zone.name} needs combat level ${zone.levelRequired}`,
      ).toBeGreaterThanOrEqual(zone.levelRequired)
    })
  }
})
