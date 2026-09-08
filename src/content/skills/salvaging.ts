import type { SkillAction, SkillDef } from '../types'
import { FABRICATION } from './fabrication'
import { REFINING } from './refining'
import { getItem } from '../items'

/**
 * Salvaging - taking your own work back apart.
 *
 * **Every action here is derived from the recipe that made the thing.** Stripping
 * reverses Fabrication; recycling reverses Refining. Nothing in this file is a
 * hand-written recipe, and that is the point: the hand-written version covered 8 of 23
 * fabricable items and had quietly stopped keeping up, so the fifteen it missed were the
 * whole late game. A skill whose job is "a sink for gear you have outgrown" did not work
 * at the point you have the most outgrown gear.
 *
 * Deriving it means coverage cannot drift again. Add a recipe anywhere and its teardown
 * exists the same day, at the right level, returning the right materials.
 *
 * The two halves are the same operation at different depths, which is why they are one
 * skill rather than two. A separate Recycling skill would have been a second ladder
 * trained by consuming things you had to make first - the same shape that got
 * Cartography deleted.
 *
 * What cannot be taken apart is raw stock. Scrap has no constituents; turning an ingot
 * into half an ingot is a furnace, not a teardown.
 */

/** What fraction of a recipe's inputs come back. Deliberately lossy - see below. */
export const SALVAGE_RETURN = 0.5

/**
 * Taking apart is quicker than making, and pays proportionally less.
 *
 * Both are the same fraction on purpose, so xp per second matches the skill being
 * reversed and Salvaging lands on the same 1-99 curve as everything else. Changing one
 * without the other silently moves this skill off the one-month target.
 */
const DURATION_SCALE = 0.6
const XP_SCALE = 0.6

/**
 * The rule that keeps this a sink rather than a source: **you never get back more than
 * you put in**, so making and unmaking in a loop is always worse than gathering.
 *
 * Flooring each input is what guarantees it. Across the current recipes that returns
 * between 33% and 50% by unit count and never zero - but a future recipe made entirely
 * of single units would floor to nothing, so the largest input is kept as a single unit
 * in that case. One back from five in is still a loss; nothing back is a bug.
 */
function teardownOutputs(inputs: readonly { item: string; qty: number }[]) {
  const halved = inputs
    .map((input) => ({ item: input.item, qty: Math.floor(input.qty * SALVAGE_RETURN) }))
    .filter((stack) => stack.qty > 0)
  if (halved.length > 0) return halved

  const largest = [...inputs].sort((a, b) => b.qty - a.qty)[0]
  return largest ? [{ item: largest.item, qty: 1 }] : []
}

/**
 * Hand-written lines, kept for the parts that had them.
 *
 * Deriving the actions gained coverage and lost voice: forty copies of the same generic
 * sentence is worse writing than eight good ones, even though it is better content.
 * Keyed by item so a line survives an action being renamed or retimed, and so adding one
 * later means adding a string here rather than touching the derivation.
 */
const FLAVOUR: Readonly<Record<string, string>> = {
  frame_steel: 'The first thing you ever built. You get about half of it back.',
  arms_servo: 'The tolerances were always wrong by a millimetre. You stop minding.',
  legs_tracked: 'They kept you upright for a long time. The tracks come off in one piece.',
  weapon_rivet: 'A construction tool again, briefly, on the way to being nothing.',
  reactor_cell: 'You vent it first. You learned to vent it first the hard way.',
  frame_titanium: 'It took a great deal of hitting to justify replacing this.',
  frame_marine: 'The seals give up all at once, with a sound like the sea leaving.',
  frame_aeroshell: 'Built to fly. It comes apart in your hands like it was waiting to.',
  steel_ingot: 'Back to the shape it was before you insisted otherwise.',
  core_matrix: 'It stops humming a moment before you expect it to.',
}

function teardown(recipe: SkillAction, verb: 'Strip' | 'Recycle', fallback: string): SkillAction {
  const made = recipe.outputs[0]!
  const name = getItem(made.item)?.name ?? made.item
  return {
    // Keyed on the item rather than the source action's id, so this does not depend on
    // one naming convention in Fabrication and a different one in Refining.
    id: `${verb.toLowerCase()}_${made.item}`,
    name: `${verb} ${name}`,
    description: FLAVOUR[made.item] ?? fallback,
    levelRequired: recipe.levelRequired,
    duration: Math.round(recipe.duration * DURATION_SCALE * 10) / 10,
    inputs: [{ item: made.item, qty: made.qty }],
    outputs: teardownOutputs(recipe.inputs ?? []),
    // Kept to one decimal rather than rounded to a whole number. Rounding xp to an
    // integer broke the exact-rate promise above: smelting pays 4 over 4s, so its
    // teardown should pay 2.4 over 2.4s - rounded to 2 it became a quarter worse per
    // second than its level-mate, which the pacing suite correctly called a trap action.
    // Every duration and xp in the source tables is a whole number, so one decimal is
    // exact here rather than approximate.
    xp: Math.round(recipe.xp * XP_SCALE * 10) / 10,
  }
}

export const SALVAGING: SkillDef = {
  id: 'salvaging',
  name: 'Salvaging',
  description:
    'Undoing your own work. It is the same knowledge as building, run backwards, and it comes to you far more easily than it should.',
  // Sorted by level so the panel reads as one ladder rather than two lists bolted
  // together - a player does not care which skill a teardown reverses.
  actions: [
    ...FABRICATION.actions.map((recipe) =>
      teardown(recipe, 'Strip', 'Back to parts. Not all of it survives the process.'),
    ),
    ...REFINING.actions.map((recipe) =>
      teardown(recipe, 'Recycle', 'Back to stock. The furnace takes its cut going both ways.'),
    ),
  ].sort((a, b) => a.levelRequired - b.levelRequired),
}
