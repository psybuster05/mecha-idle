/**
 * Fuel, and the speed toggle it feeds.
 *
 * The old model was "burn one flask, get a timer". This one is a throttle: you pick 1x,
 * 2x or 3x and fuel drains while it is above 1. It is a better fit for an idle game -
 * the decision is standing rather than a thing you must remember to re-click - and it
 * lets a rare drop matter for as long as you choose to spend it.
 *
 * **Fuel is energy, not time.** Each item's existing `{ multiplier, seconds }` is read as
 * `seconds * (multiplier - 1)` units of energy, and running at speed M spends `M - 1`
 * per second. That reinterpretation was chosen because it leaves both items worth
 * exactly what they were worth before:
 *
 *   Catalyst Flask   600 energy -> 600s at 2x (as before), or 300s at 3x
 *   Overcharge Cell  840 energy -> 840s at 2x, or 420s at 3x (as before)
 *
 * So the Cell is still the better find, 3x still burns through it in seven minutes, and
 * nothing had to be retuned to change the mechanic.
 *
 * **Running dry drops the toggle back to 1x**, and so does asking for a speed with an
 * empty tank. A toggle reading 3x while work runs at 1x is the confusing version; better
 * that it always shows what is actually happening, with a toast saying why it moved.
 *
 * **Nothing burns while nothing is running.** Fuel buys work, so an idle mech at 3x
 * spends nothing - otherwise leaving the tab on the equipment screen would quietly empty
 * a tank you had been saving.
 */

import { getItem, ITEMS } from '../content'
import { count, removeItem } from './bank'
import { ACTOR_IDS, type GameState, type ItemId } from './state'

/** The positions on the toggle. */
export const SPEEDS = [1, 2, 3] as const
export type Speed = (typeof SPEEDS)[number]

/** Energy a single unit of this item is worth, or 0 if it is not fuel. */
export function fuelEnergy(item: ItemId): number {
  const fuel = getItem(item)?.fuel
  return fuel ? fuel.seconds * (fuel.multiplier - 1) : 0
}

/**
 * Fuel items in the order they get burned: cheapest first.
 *
 * Deterministic, which is what matters for the offline guarantee - the same fuel must be
 * spent in the same order however the time is sliced. Cheapest first is also what a
 * player would do by hand, and it keeps the good find for when they choose to spend it.
 */
const BURN_ORDER: readonly ItemId[] = ITEMS.filter((item) => item.fuel)
  .map((item) => item.id)
  .sort((a, b) => fuelEnergy(a) - fuelEnergy(b))

/** Energy per second consumed at a given speed. 1x is free. */
export function drainRate(speed: Speed): number {
  return speed - 1
}

/** Everything currently burnable: what is in the tank plus what is in the bank. */
export function availableEnergy(state: GameState): number {
  let total = state.fuelEnergy
  for (const item of BURN_ORDER) total += count(state, item) * fuelEnergy(item)
  return total
}

/**
 * How fast work is *actually* running.
 *
 * The toggle can sit at 3x with an empty tank; that is a request, not a rate.
 */
export function effectiveSpeed(state: GameState): Speed {
  if (state.speed === 1) return 1
  return availableEnergy(state) > 0 ? state.speed : 1
}

/**
 * Whether anything is actually running.
 *
 * Fuel buys work, so this is what decides whether it burns at all. Either actor counts:
 * the crawler refining on its own is work, and the speed applies to it.
 */
export function isWorking(state: GameState): boolean {
  return ACTOR_IDS.some((id) => state.actors[id].unlocked && state.actors[id].activity !== null)
}

/**
 * How long the current setting can be held, in seconds. Infinity at 1x, and Infinity
 * while idle - nothing is being spent, so there is no moment to run out at.
 *
 * Used by the read-out, and by `advance` to find the moment the tank runs dry so a
 * single large step can be split there.
 */
export function secondsOfFuel(state: GameState): number {
  const rate = drainRate(effectiveSpeed(state))
  if (rate <= 0 || !isWorking(state)) return Infinity
  return availableEnergy(state) / rate
}

/**
 * Mutates. Spends `seconds` of running at the current effective speed.
 *
 * Refills the tank from the bank as it goes, in a fixed order, so slicing the same span
 * differently spends exactly the same items. Never spends more than is there.
 */
export function burnFuelFor(state: GameState, seconds: number): void {
  // Checked up front rather than only on the refill path. Draining to *exactly* empty
  // leaves the loop before it ever asks for another item, so a tank that ran out on a
  // clean boundary would have kept the toggle showing a speed it could not pay for.
  // Deliberately before the idle check: a toggle should never sit on a speed it cannot
  // pay for, whether or not anything is running.
  if (state.speed > 1 && availableEnergy(state) <= 0) {
    state.speed = 1
    return
  }

  // Fuel buys work. Idling at 3x costs nothing.
  if (!isWorking(state)) return

  const rate = drainRate(effectiveSpeed(state))
  if (rate <= 0 || seconds <= 0) return

  let owed = rate * seconds
  while (owed > 0) {
    if (state.fuelEnergy <= 0) {
      const next = BURN_ORDER.find((item) => count(state, item) > 0)
      if (!next) {
        // Ran out part-way through this step. The check at the top catches the next one.
        state.fuelEnergy = 0
        state.speed = 1
        return
      }
      removeItem(state, next, 1)
      state.fuelEnergy += fuelEnergy(next)
    }
    const spent = Math.min(owed, state.fuelEnergy)
    state.fuelEnergy -= spent
    owed -= spent
  }
}
