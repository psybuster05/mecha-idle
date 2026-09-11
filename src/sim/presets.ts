import { ITEMS, SKILLS, getItem } from '../content'
import { PRESETS, type PresetDef } from '../content/presets'
import { advanceStory } from './story'
import { derivedStats } from './stats'
import { newGame, type EquipSlot, type GameState, type ItemId } from './state'
import { xpForLevel } from './xp'

/**
 * Turning a stage into a save.
 *
 * Built from the same pieces a played save is made of - levels, kills, a bank, fitted
 * gear - rather than being hand-written JSON. Hand-written state is a second copy of the
 * state shape that nothing keeps in step: it survives every rename by silently being
 * wrong, and a save that no longer parses is one a tester meets as a crash.
 */

/**
 * The best of everything you could have made by that level, one per slot.
 *
 * Derived from the fabrication table rather than listed by id, so a new tier of gear
 * lands in the presets the day it lands in the game. Ties go to whichever recipe is
 * written last, which is where content tables put the capstone of a tier - that is what
 * hands the endgame save The Sentence and the Command Frame rather than the first
 * level-90 rows in the file.
 */
export function bestLoadout(fabricationLevel: number): Partial<Record<EquipSlot, ItemId>> {
  const fabrication = SKILLS.find((skill) => skill.id === 'fabrication')
  const fitted: Partial<Record<EquipSlot, ItemId>> = {}
  const fittedLevel: Partial<Record<EquipSlot, number>> = {}

  for (const action of fabrication?.actions ?? []) {
    if (action.levelRequired > fabricationLevel) continue
    for (const output of action.outputs) {
      const slot = getItem(output.item)?.slot
      if (!slot) continue
      if ((fittedLevel[slot] ?? -1) > action.levelRequired) continue
      fittedLevel[slot] = action.levelRequired
      fitted[slot] = output.item
    }
  }
  return fitted
}

export function buildPreset(def: PresetDef, now: number): GameState {
  // A fixed seed per preset, so two testers looking at the same slot are looking at the
  // same game rather than comparing notes on different luck.
  const state = newGame(def.id === 'mid' ? 0x5eed11 : 0x5eed22)

  for (const [skill, level] of Object.entries(def.levels)) {
    state.skills[skill as keyof typeof state.skills] = xpForLevel(level)
  }

  for (const boss of def.defeated) state.defeated[boss] = 1

  // Everything that is not a part. Materials, fuel and drops, so no panel opens on
  // "waiting for" - a tester who has to go and gather before they can look at
  // Fabrication has been handed the tutorial again.
  for (const item of ITEMS) {
    if (item.slot) continue
    state.bank[item.id] = def.stock
  }

  state.equipment = bestLoadout(def.levels.fabrication ?? 1)

  // One of every *other* weapon this save could have fabricated, in the bank. Without
  // them a tester dropped into the middle of the game has nothing to switch to, and the
  // weapon plans on every boss record would be a menu with one item on it. Only weapons
  // at or below the save's Fabrication level - the same honesty rule the loadout keeps.
  const fabrication = SKILLS.find((skill) => skill.id === 'fabrication')
  for (const action of fabrication?.actions ?? []) {
    if (action.levelRequired > (def.levels.fabrication ?? 1)) continue
    for (const output of action.outputs) {
      if (getItem(output.item)?.slot !== 'weapon') continue
      if (output.item === state.equipment.weapon) continue
      state.bank[output.item] = 1
    }
  }

  if (def.crawler) {
    state.actors.crawler.unlocked = true
    state.actors.crawler.at = state.actors.mech.at
  }

  // Arriving at full health, not at the 0 a fresh game uses as "never fought".
  state.combat.hp = derivedStats(state).maxHp

  // Everything this save has already earned is already *read*. Without this the first
  // frame queues a beat for every boss down and every level passed, and a tester who
  // picked Endgame meets a stack of interrupt dialogs instead of the endgame.
  advanceStory(state)
  state.story.seen = [...state.story.seen, ...state.story.pending]
  state.story.pending = []

  // Stamped as saved *now*, so a preset opened for the first time credits no offline
  // progress. A savedAt of 0 would read as an absence since the epoch.
  state.savedAt = now
  return state
}

export function buildPresetById(id: string, now: number): GameState | null {
  const def = PRESETS.find((preset) => preset.id === id)
  return def ? buildPreset(def, now) : null
}
