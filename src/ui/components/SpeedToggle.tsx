import { setSpeed } from '../../sim/intents'
import { SPEEDS, availableEnergy, drainRate, effectiveSpeed, type Speed } from '../../sim/fuel'
import type { GameState } from '../../sim/state'
import { formatSeconds } from '../format'

/**
 * The throttle: 1x, 2x, 3x, and what it is costing.
 *
 * Lives in the top bar rather than a panel because it applies to whatever you are doing
 * and you should be able to change it without leaving the thing you are watching.
 *
 * The selected speed and the running speed are shown as different things on purpose. A
 * toggle set to 3x with an empty tank is a standing request, not a lie - it starts
 * paying out the moment fuel is found, and saying "3x" while running at 1x would be the
 * confusing version.
 */
export function SpeedToggle({
  state,
  dispatch,
  onNoFuel,
}: {
  state: GameState
  dispatch: (transform: (s: GameState) => GameState) => void
  /** Called when a speed is picked that there is no fuel to run. */
  onNoFuel: () => void
}) {
  const running = effectiveSpeed(state)
  const energy = availableEnergy(state)
  const rate = drainRate(state.speed)
  const stalled = state.speed > 1 && running === 1

  const pick = (speed: Speed) => {
    // The toggle still moves - it is a standing preference, so setting 3x with an empty
    // tank means "3x as soon as there is fuel". The toast explains why nothing sped up,
    // which is the part that would otherwise look broken.
    if (speed > 1 && energy <= 0) onNoFuel()
    dispatch((s) => setSpeed(s, speed))
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
            title={speed === 1 ? 'Normal speed. Costs no fuel.' : `${speed}x speed. Burns fuel.`}
            onClick={() => pick(speed)}
          >
            <Chevrons count={speed} />
          </button>
        ))}
      </div>
      <span className={`speed-note ${stalled ? 'warn' : 'dim'}`}>
        {stalled
          ? 'no fuel'
          : rate > 0
            ? `${formatSeconds(energy / rate)} of fuel`
            : energy > 0
              ? `${Math.floor(energy)} fuel`
              : 'no fuel'}
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
