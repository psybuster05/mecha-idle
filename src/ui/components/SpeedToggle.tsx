import { setSpeed } from '../../sim/intents'
import { SPEEDS, availableEnergy, drainRate, effectiveSpeed } from '../../sim/fuel'
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
}: {
  state: GameState
  dispatch: (transform: (s: GameState) => GameState) => void
}) {
  const running = effectiveSpeed(state)
  const energy = availableEnergy(state)
  const rate = drainRate(state.speed)
  const stalled = state.speed > 1 && running === 1

  return (
    <div className="speed">
      <div className="speed-buttons" role="group" aria-label="Work speed">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            className={`speed-button ${state.speed === speed ? 'selected' : ''}`}
            aria-pressed={state.speed === speed}
            onClick={() => dispatch((s) => setSpeed(s, speed))}
          >
            {speed}&times;
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
