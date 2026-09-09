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
 */

function label(slot: SlotId): { name: string; blurb: string } {
  if (slot === 'own') {
    return { name: 'Your game', blurb: 'The playthrough you started. Nothing here is pre-made.' }
  }
  const preset = PRESETS.find((p) => p.id === slot)
  return { name: preset?.name ?? slot, blurb: preset?.blurb ?? '' }
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
}: {
  active: SlotId
  /** Given the chance to flush the current game before the page goes away. */
  onSwitch: () => void
}) {
  const choose = (slot: SlotId) => {
    if (slot === active) return
    onSwitch()
    writeActiveSlot(slot)
    location.reload()
  }

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
    </div>
  )
}
