import { getSkill } from '../content'
import { SAVE_VERSION, type GameState } from '../sim/state'
import { serialize } from '../sim/save'
import { combatLevel } from '../sim/stats'
import type { SlotId } from '../platform/SaveAdapter'
import { BUILD } from './build'

/**
 * What a tester sends back.
 *
 * A playtest with no way to report is a vibe check: three people say it was good and
 * nothing in it can be acted on. The point of this file is that "it broke" becomes a
 * paste containing the save it broke in.
 *
 * Two shapes, because the two moments have different amounts to work with. A player
 * reporting from inside a working game has the live state; a player reporting from the
 * crash screen has no state at all - React unmounted the tree - and only what is on
 * disk. The crash version therefore reads the save back rather than serialising memory,
 * which is also the safer of the two: **memory during a crash is exactly the thing you
 * should not trust**, and the whole reason nothing writes to a slot after a failure.
 *
 * The header is for the human reading it. The JSON underneath is for loading.
 */

const RULE = '--- save below, paste all of it ---'

function header(lines: readonly string[]): string {
  return ['Mecha Idle report', ...lines].join('\n')
}

/** A readable summary, so the report says something before anyone parses it. */
function summary(state: GameState, slot: SlotId): string[] {
  const activity = state.actors.mech.activity
  const doing =
    activity === null
      ? 'idle'
      : activity.kind === 'combat'
        ? `fighting (${state.combat.enemyId ?? 'between targets'})`
        : `${getSkill(activity.skill)?.name ?? activity.skill} / ${activity.action}`

  return [
    `when: ${new Date().toISOString()}`,
    `build: ${BUILD}`,
    `slot: ${slot}`,
    `save version: ${SAVE_VERSION}`,
    `combat level: ${combatLevel(state)}`,
    `doing: ${doing}`,
    `speed: ${state.speed}x`,
    `bosses down: ${Object.keys(state.defeated).join(', ') || 'none'}`,
    `bank: ${Object.keys(state.bank).length} kinds`,
  ]
}

/** From inside a working game. */
export function playerReport(state: GameState, slot: SlotId, note?: string): string {
  return [
    header([...(note ? [`note: ${note}`] : []), ...summary(state, slot)]),
    '',
    RULE,
    serialize(state, Date.now()),
  ].join('\n')
}

/**
 * From the crash screen.
 *
 * `stored` is whatever was on disk, passed straight through without parsing it. A save
 * that will not parse is precisely the one worth having, and re-serialising it here
 * would be this code deciding what a broken save looks like.
 */
export function crashReport(
  error: unknown,
  slot: SlotId,
  stored: string | null,
  componentStack?: string,
): string {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error && error.stack ? error.stack : '(no stack)'

  return [
    header([
      `when: ${new Date().toISOString()}`,
      `build: ${BUILD}`,
      `slot: ${slot}`,
      `save version expected: ${SAVE_VERSION}`,
      `error: ${message}`,
      '',
      stack,
      ...(componentStack ? ['', 'component stack:', componentStack.trim()] : []),
    ]),
    '',
    RULE,
    stored ?? '(nothing saved in this slot)',
  ].join('\n')
}

/**
 * Returns whether it landed, so the button can say so.
 *
 * The clipboard needs a secure context, which localhost and the published https page
 * both are - but a browser can still refuse, and a button that silently does nothing is
 * worse than one that admits it.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
