import { useState } from 'react'
import { PRESETS } from '../../content/presets'
import { SLOT_IDS, slotKey, writeActiveSlot, type SlotId } from '../../platform/SaveAdapter'

/**
 * Three saves: the one being played, and two stages to be dropped into.
 *
 * **Switching saves the current slot and then reloads the page.** A reload is blunt and
 * it is deliberate: booting a slot means loading it, migrating it, crediting time away
 * and restarting the clock, and that path already exists and is tested exactly once - at
 * boot. Re-entering it in place would mean resetting the state ref, the animation frame
 * loop, the autosave timer and the toast baselines together, and the failure mode if any
 * one of them lagged is the autosave writing one slot's game over another's. On a static
 * page a reload costs nothing; somebody's playthrough costs everything.
 *
 * Resetting takes the same road for the same reason, and it is what makes the preset
 * slots reusable: a tester who spent an endgame save's bank, or wants to watch the
 * opening again from nothing, gets the slot back rather than being stuck with what they
 * did to it.
 */

interface SlotLabel {
  name: string
  blurb: string
  /** What resetting it gives you back. Named, because "reset" alone says only what goes. */
  becomes: string
}

function label(slot: SlotId): SlotLabel {
  if (slot === 'own') {
    return {
      name: 'Your game',
      blurb: 'The playthrough you started. Nothing here is pre-made.',
      becomes: 'a new game, opening on Scavenging alone',
    }
  }
  const preset = PRESETS.find((p) => p.id === slot)
  return {
    name: preset?.name ?? slot,
    blurb: preset?.blurb ?? '',
    becomes: `the ${preset?.name ?? slot} save as it ships`,
  }
}

/** Whether a slot has been opened before. Read directly, since there is no state for it. */
function started(slot: SlotId): boolean {
  try {
    return localStorage.getItem(slotKey(slot)) !== null
  } catch {
    return false
  }
}

export function SlotPicker({
  active,
  onSwitch,
  onReset,
}: {
  active: SlotId
  /** Given the chance to flush the current game before the page goes away. */
  onSwitch: () => void
  /** Must stop the autosave *before* clearing, or the game in memory lands straight back. */
  onReset: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)

  const choose = (slot: SlotId) => {
    if (slot === active) return
    onSwitch()
    writeActiveSlot(slot)
    location.reload()
  }

  const current = label(active)

  return (
    <div className="slots" role="group" aria-label="Save slot">
      {SLOT_IDS.map((slot) => {
        const { name, blurb } = label(slot)
        return (
          <button
            key={slot}
            className={`slot-button ${slot === active ? 'selected' : ''}`}
            onClick={() => choose(slot)}
            title={started(slot) || slot === 'own' ? blurb : `${blurb} Not started yet.`}
            aria-pressed={slot === active}
          >
            {name}
          </button>
        )
      })}

      {/* Set apart from the three, because the three are navigation and this is not. */}
      <button
        className="slot-reset"
        onClick={() => setConfirming(true)}
        title={`Reset ${current.name}`}
      >
        Reset
      </button>

      {confirming && (
        <div className="modal-backdrop" onClick={() => setConfirming(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2>Reset {current.name}?</h2>
            {/* Names the slot twice and says what comes back. A confirm that only asks
                "are you sure?" is asking about something the player has to remember they
                clicked, and the answer here is unrecoverable. */}
            <p className="dim">
              Everything in <strong>{current.name}</strong> goes, and it opens again as{' '}
              {current.becomes}. The other two saves are untouched.
            </p>
            <p className="warn">This cannot be undone.</p>
            <div className="modal-actions">
              <button className="primary" onClick={() => void onReset()}>
                Reset {current.name}
              </button>
              <button onClick={() => setConfirming(false)}>Keep it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
