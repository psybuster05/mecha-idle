import { useEffect, useRef } from 'react'
import { setSpeed } from '../../sim/intents'
import { SPEEDS, availableEnergy, drainRate } from '../../sim/fuel'
import type { GameState } from '../../sim/state'
import { formatSeconds } from '../format'

/**
 * The throttle: 1x, 2x, 3x, and what it is costing.
 *
 * Lives in the top bar rather than a panel because it applies to whatever you are doing
 * and you should be able to change it without leaving the thing you are watching.
 *
 * Asking for a speed you cannot afford bounces straight back to 1x and says why. The
 * buttons stay clickable rather than going disabled: a disabled control tells you that
 * you cannot press it but never what would let you, and the toast does.
 *
 * The tank emptying while you work does the same thing on its own, for the same reason -
 * a toggle reading 3x while work runs at 1x is the confusing version.
 */
export function SpeedToggle({
  state,
  dispatch,
  onNoFuel,
}: {
  state: GameState
  dispatch: (transform: (s: GameState) => GameState) => void
  /** Called when the toggle lands back on 1x for want of fuel, asked for or not. */
  onNoFuel: (asked: boolean) => void
}) {
  const energy = availableEnergy(state)
  const rate = drainRate(state.speed)
  const dry = energy <= 0

  // Running out is the one fuel event with no visible cause: work quietly halves in
  // speed and nothing on screen says why. Watching for the transition here rather than
  // in the sim keeps the notice a view concern, which is where it belongs.
  const wasFuelled = useRef(!dry)
  useEffect(() => {
    if (dry && wasFuelled.current) onNoFuel(false)
    wasFuelled.current = !dry
  }, [dry, onNoFuel])

  const pick = (speed: number) => {
    if (speed > 1 && dry) {
      // Land on 1x rather than leaving the toggle asking for something it cannot have.
      onNoFuel(true)
      dispatch((s) => setSpeed(s, 1))
      return
    }
    dispatch((s) => setSpeed(s, speed as 1 | 2 | 3))
  }

  return (
    <div className="speed">
      <div className="speed-buttons" role="group" aria-label="Work speed">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            className={`speed-button ${state.speed === speed ? 'selected' : ''}`}
            aria-pressed={state.speed === speed}
            aria-label={`${speed} times speed`}
            title={
              speed === 1
                ? 'Normal speed. Costs no fuel.'
                : dry
                  ? 'No fuel. Find some by scavenging, or take it off what you kill.'
                  : `${speed}x speed. Burns fuel while you are working.`
            }
            onClick={() => pick(speed)}
          >
            <Chevrons count={speed} />
          </button>
        ))}
      </div>
      <span className={`speed-note ${dry ? 'warn' : 'dim'}`}>
        {dry
          ? 'no fuel'
          : rate > 0
            ? `${formatSeconds(energy / rate)} of fuel`
            : `${Math.floor(energy)} fuel`}
      </span>
    </div>
  )
}

/**
 * One, two or three chevrons - the fast-forward metaphor everyone already knows.
 *
 * Drawn as SVG rather than as a pixel sprite, unlike the rest of the game's icons,
 * because this one has to inverate against the selected button: `currentColor` follows
 * the button's text colour, and a canvas cannot. The art rules are about game content;
 * this is a transport control.
 */
function Chevrons({ count }: { count: number }) {
  // Centred whatever the count, so the three buttons are the same width and the row does
  // not shift as you click along it.
  const starts = count === 1 ? [10] : count === 2 ? [6, 13] : [3, 10, 17]
  return (
    <svg className="chevrons" viewBox="0 0 26 12" aria-hidden="true" focusable="false">
      {starts.map((x) => (
        <polyline
          key={x}
          points={`${x},2 ${x + 4},6 ${x},10`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
