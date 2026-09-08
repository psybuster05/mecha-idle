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
 * **The first snapshot is deliberately not compared to anything.** Offline progress is
 * credited before React ever renders, so the first bank the UI sees already contains
 * however many hours of gains; diffing against an empty starting point would fire a
 * toast for every item earned overnight. The offline dialog already reports that, in a
 * form that can hold it.
 *
 * Losses are ignored. Spending materials is something you chose and are already looking
 * at; finding one is the thing that happens while you are reading something else.
 */
export function useItemGains(
  state: GameState,
  onGain: (item: string, label: string, qty: number) => void,
): void {
  const previous = useRef<Partial<Record<string, number>> | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = state.bank

    if (!before) return // first snapshot: establish a baseline, announce nothing

    for (const [item, qty] of Object.entries(state.bank)) {
      const had = before[item] ?? 0
      const now = qty ?? 0
      if (now > had) onGain(item, itemName(item), now - had)
    }
  }, [state.bank, onGain])
}
