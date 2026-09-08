import type { SkillAction, SkillDef } from '../types'
import { FABRICATION } from './fabrication'
import { getItem } from '../items'

/**
 * Salvaging - taking your own work back apart.
 *
 * **Derived from Fabrication rather than written by hand.** Every action here is
 * generated from the recipe that built the thing, which is the whole point: the
 * hand-written version covered 8 of 23 fabricable items and had silently stopped keeping
 * up, so the fifteen it missed were every late-game part - the Harpoon Launcher, The
 * Sentence, the Command Frame. A skill whose job is "a sink for gear you have outgrown"
 * did not work at the point you have the most outgrown gear.
 *
 * Deriving it means coverage cannot drift again. Add a fabrication recipe and its
 * salvage exists the same day, at the right level, returning the right materials.
 *
 * Only fabricated things can be stripped, because only they have parts to give back.
 * Raw scrap has no constituents - "salvaging" an ingot into half an ingot would be a
 * furnace, not a teardown.
 */

/** What fraction of a recipe's inputs come back. Deliberately lossy - see below. */
export const SALVAGE_RETURN = 0.5

/**
 * Stripping is quicker than building, and pays proportionally less.
 *
 * Both are the same fraction on purpose, so xp per second matches Fabrication exactly
 * and Salvaging lands on the same 1-99 curve as every other skill. Changing one without
 * the other silently moves this skill off the one-month target.
 */
const DURATION_SCALE = 0.6
const XP_SCALE = 0.6

/**
 * The rule that keeps this a sink rather than a source: **you never get back more than
 * you put in**, so building and stripping in a loop is always worse than gathering.
 *
 * Flooring each input is what guarantees it. Across the current 23 recipes that returns
 * between 33% and 50% by unit count and never zero - but a future recipe made entirely
 * of single units would floor to nothing, so the largest input is kept as a single unit
 * in that case. One back from five in is still a loss; nothing back is a bug.
 */
function salvageOutputs(inputs: readonly { item: string; qty: number }[]) {
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
 * Deriving the actions gained coverage and lost voice: twenty-three copies of the same
 * generic sentence is worse writing than eight good ones, even though it is better
 * content. Keyed by item so a line survives an action being renamed or retimed, and so
 * adding one later means adding a string here rather than touching the derivation.
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
}

function deriveSalvage(recipe: SkillAction): SkillAction {
  const made = recipe.outputs[0]!
  const name = getItem(made.item)?.name ?? made.item
  return {
    id: recipe.id.replace(/^fab_/, 'strip_'),
    name: `Strip ${name}`,
    description: FLAVOUR[made.item] ?? `Back to parts. Not all of it survives the process.`,
    levelRequired: recipe.levelRequired,
    duration: Math.round(recipe.duration * DURATION_SCALE * 10) / 10,
    inputs: [{ item: made.item, qty: made.qty }],
    outputs: salvageOutputs(recipe.inputs ?? []),
    xp: Math.max(1, Math.round(recipe.xp * XP_SCALE)),
  }
}

export const SALVAGING: SkillDef = {
  id: 'salvaging',
  name: 'Salvaging',
  description:
    'Undoing your own work. It is the same knowledge as building, run backwards, and it comes to you far more easily than it should.',
  actions: FABRICATION.actions.map(deriveSalvage),
}
