import { useEffect } from 'react'
import { STORY_BEATS, getStoryBeat } from '../../content/story'
import { readAllStoryBeats } from '../../sim/intents'
import type { GameState } from '../../sim/state'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

/**
 * Everything recovered so far, newest first.
 *
 * Opening the panel is what marks quiet beats as read - there is no "mark as read"
 * button, because the act of looking is the acknowledgement. Interrupts are excluded:
 * those are cleared by their own dialog, so one cannot be skipped by opening this.
 */
export function LogPanel({ state, dispatch }: Props) {
  const unreadLogs = state.story.pending.filter(
    (id) => getStoryBeat(id)?.kind === 'log',
  )

  // Keyed on the ids themselves rather than the array, which is rebuilt every render.
  const unreadKey = unreadLogs.join(',')
  useEffect(() => {
    if (unreadKey === '') return
    dispatch((s) => readAllStoryBeats(s, unreadKey.split(',')))
  }, [unreadKey, dispatch])

  // Newest first, in the order they were recovered rather than the order they are
  // authored - the story arrives out of sequence and the log should show that.
  const recovered = [...state.story.seen, ...state.story.pending]
    .map((id) => getStoryBeat(id))
    .filter((beat): beat is NonNullable<typeof beat> => beat !== undefined)
    .reverse()

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>Log</h2>
          <p className="dim flavour">
            Fragments, in the order they came back. They do not come back in order.
          </p>
        </div>
        <div className="level-block">
          <div className="level-number">{recovered.length}</div>
          <div className="dim">of {STORY_BEATS.length}</div>
        </div>
      </header>

      {recovered.length === 0 ? (
        <p className="dim">Nothing yet. Most of you is still missing.</p>
      ) : (
        <ul className="log-list">
          {recovered.map((beat) => (
            <li key={beat.id} className={`log-entry ${beat.kind}`}>
              <h3>{beat.title}</h3>
              {beat.body.map((paragraph, index) => (
                <p key={index} className="story-line">
                  {paragraph}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
