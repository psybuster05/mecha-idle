import type { GameState } from '../../sim/state'
import { ALL_SKILLS } from '../../sim/state'

/**
 * The three things a stranger does not know yet.
 *
 * The first thing a new player reads is *Cold Start*, which is four paragraphs of very
 * good atmosphere and tells them nothing about what to do. Somebody handed a link has no
 * idea this is a genre where you pick one job and leave, that closing the tab is
 * *allowed*, or that there is a speed control. None of that is in the fiction and none
 * of it should be - so it is here instead, in the plainest words in the game.
 *
 * **Shown while the player has done nothing, and gone the moment they start.** Derived,
 * not dismissed: no flag, no save field, nothing to migrate, and nothing to get stuck on
 * if somebody resets a slot. The same choice the tutorial and `waitingFor` make.
 */
function hasDoneNothing(state: GameState): boolean {
  if (state.actors.mech.activity !== null) return false
  if (ALL_SKILLS.some((skill) => state.skills[skill] > 0)) return false
  return Object.keys(state.bank).length === 0
}

export function FirstRun({ state }: { state: GameState }) {
  if (!hasDoneNothing(state)) return null

  return (
    <aside className="first-run">
      <h3>You have just woken up.</h3>
      <ul>
        <li>
          <strong>Pick one thing below and press Start.</strong> You only have attention
          for one job at a time - that is the whole game.
        </li>
        <li>
          <strong>It keeps working without you.</strong> Close the tab and come back; you
          are credited what you would have earned, up to a day.
        </li>
        <li>
          <strong>The chevrons at the top run the clock faster</strong> once you have fuel
          for them. More skills open as the ones you have get better.
        </li>
      </ul>
    </aside>
  )
}
