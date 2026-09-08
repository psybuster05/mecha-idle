import { useEffect, useRef } from 'react'
import { itemName } from '../content'
import type { GameState } from '../sim/state'

/**
 * Watches the bank and reports anything that went up.
 *
 * Done by diffing snapshots rather than by having the simulation announce things. The
 * sim stays pure and knows nothing about notices, and this stays what it is - a view
 * noticing that a number changed.
 *
 * **The first loaded snapshot is deliberately not compared to anything.** Diffing it
 * against an empty starting point would fire a toast for every item earned overnight, and
 * the offline dialog already reports that in a form that can hold it.
 *
 * Which is why this takes `loaded` rather than working it out from the state. The very
 * first snapshot React renders is not the save - it is the empty default the store starts
 * on, before the adapter has answered - so establishing the baseline there put an empty
 * bank against a restored one and toasted the entire night's haul. Nothing is recorded
 * until the save is actually in.
 *
 * Losses are ignored. Spending materials is something you chose and are already looking
 * at; finding one is the thing that happens while you are reading something else.
 */
export function useItemGains(
  state: GameState,
  onGain: (item: string, label: string, qty: number) => void,
  /** False until the save has been read and offline progress credited. */
  loaded: boolean,
): void {
  const previous = useRef<Partial<Record<string, number>> | null>(null)

  useEffect(() => {
    if (!loaded) return // not the save yet, just the empty state the store boots on

    const before = previous.current
    previous.current = state.bank

    if (!before) return // first snapshot: establish a baseline, announce nothing

    for (const [item, qty] of Object.entries(state.bank)) {
      const had = before[item] ?? 0
      const now = qty ?? 0
      if (now > had) onGain(item, itemName(item), now - had)
    }
  }, [state.bank, onGain, loaded])
}
