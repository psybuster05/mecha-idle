/**
 * Content registry. The single lookup point for every data table.
 */

import type { ActionId, GatheringSkillId } from '../sim/state'
import type { SkillAction, SkillDef } from './types'
import { SCAVENGING } from './skills/scavenging'
import { REFINING } from './skills/refining'
import { FABRICATION } from './skills/fabrication'

export const SKILLS: readonly SkillDef[] = [SCAVENGING, REFINING, FABRICATION]

const skillsById = new Map<GatheringSkillId, SkillDef>(SKILLS.map((s) => [s.id, s]))

/** action lookup keyed "skillId:actionId" - actions are only unique within a skill. */
const actionsByKey = new Map<string, SkillAction>()
for (const skill of SKILLS) {
  for (const action of skill.actions) {
    actionsByKey.set(`${skill.id}:${action.id}`, action)
  }
}

export function getSkill(id: GatheringSkillId): SkillDef | undefined {
  return skillsById.get(id)
}

export function getAction(skill: GatheringSkillId, action: ActionId): SkillAction | undefined {
  return actionsByKey.get(`${skill}:${action}`)
}

export { ITEMS, getItem, itemName } from './items'
export type { ItemDef, SkillAction, SkillDef, ItemStack, DropChance } from './types'
