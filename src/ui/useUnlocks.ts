import { useEffect, useRef } from 'react'
import { getStage } from '../content/tutorial'
import { unlockedStages } from '../sim/tutorial'
import type { GameState } from '../sim/state'

/**
 * Reports a stage of the opening the moment it opens.
 *
 * Found by diffing what is unlocked between snapshots, exactly as item gains are found.
 * The simulation announces nothing and stays unaware that a notice exists.
 *
 * `loaded` for the same reason `useItemGains` takes it: the first snapshot React renders
 * is the empty default the store boots on, not the save. Establishing a baseline there
 * would greet a returning player with a toast for every skill they recovered weeks ago.
 */
export function useUnlocks(
  state: GameState,
  onUnlock: (label: string) => void,
  loaded: boolean,
): void {
  const previous = useRef<string[] | null>(null)

  useEffect(() => {
    if (!loaded) return

    const now = unlockedStages(state)
    const before = previous.current
    previous.current = now

    if (!before) return // first loaded snapshot: a baseline, not an announcement

    for (const stage of now) {
      if (before.includes(stage)) continue
      const line = getStage(stage)?.recovered
      if (line) onUnlock(line)
    }
  }, [state, onUnlock, loaded])
}
