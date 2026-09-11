import type { StoryBeat } from '../../content/story'
import { useFocusAtTop } from '../useFocusAtTop'

/**
 * The rationed interrupt.
 *
 * Only the waking, each boss, and the ending get one - roughly eight in the whole game.
 * Everything else lands quietly in the Log, because a game meant to sit on a second
 * screen must never demand attention it was not given.
 */
export function StoryDialog({ beat, onDismiss }: { beat: StoryBeat; onDismiss: () => void }) {
  const { container, button } = useFocusAtTop<HTMLButtonElement>()
  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div
        ref={container}
        className="modal story-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="story-kicker dim">Log</div>
        <h2>{beat.title}</h2>
        {beat.body.map((paragraph, index) => (
          <p key={index} className="story-line">
            {paragraph}
          </p>
        ))}
        <button ref={button} className="primary" onClick={onDismiss}>
          Continue
        </button>
      </div>
    </div>
  )
}
