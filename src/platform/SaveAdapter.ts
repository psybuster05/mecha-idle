/**
 * Where the save actually lives.
 *
 * This is the *only* file in the project allowed to touch a storage backend. The sim
 * never sees it (eslint enforces that localStorage is unreachable from sim/), so the
 * desktop build swaps in a filesystem adapter - and later a Steam Cloud one - by
 * adding a class here and changing one line at the composition root.
 *
 * The interface is async even though localStorage is synchronous, precisely so those
 * later adapters fit without changing a single caller.
 */

export interface SaveAdapter {
  load(): Promise<string | null>
  save(data: string): Promise<void>
  clear(): Promise<void>
}

export const SAVE_KEY = 'mecha-idle/save'

/**
 * Three saves: the one being played, and two stages a tester can be dropped into.
 *
 * **Slot 'own' keeps the original key**, and that is the whole migration. Every save
 * that existed before slots did is already the played one; moving it would have meant
 * a copy, a delete and a window in between where somebody's playthrough lived nowhere.
 * Not moving it cannot fail.
 *
 * The preset slots hold ordinary saves once seeded - a tester's changes stick, the
 * autosave writes them, and a migration would run on them like any other. Seeding is
 * only what fills an *empty* one.
 */
export type SlotId = 'own' | 'mid' | 'end'
export const SLOT_IDS: readonly SlotId[] = ['own', 'mid', 'end']

export function slotKey(slot: SlotId): string {
  return slot === 'own' ? SAVE_KEY : `${SAVE_KEY}/${slot}`
}

const ACTIVE_SLOT_KEY = 'mecha-idle/slot'

/**
 * Which slot is being played. Lives outside every slot, because a pointer stored inside
 * the thing it points at cannot be read before you have chosen what to read.
 */
export function readActiveSlot(): SlotId {
  try {
    const stored = localStorage.getItem(ACTIVE_SLOT_KEY)
    return SLOT_IDS.find((slot) => slot === stored) ?? 'own'
  } catch {
    return 'own'
  }
}

export function writeActiveSlot(slot: SlotId): void {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, slot)
  } catch {
    // Storage blocked. The game still runs; it just opens on the played slot next time.
  }
}

export class LocalStorageAdapter implements SaveAdapter {
  constructor(private readonly key: string = SAVE_KEY) {}

  async load(): Promise<string | null> {
    try {
      return localStorage.getItem(this.key)
    } catch {
      // Private browsing and blocked-storage settings throw on access rather than
      // returning null. A missing save is recoverable; crashing on boot is not.
      return null
    }
  }

  async save(data: string): Promise<void> {
    try {
      localStorage.setItem(this.key, data)
    } catch (error) {
      // Quota exceeded, or storage disabled. Surface it rather than pretending the
      // save landed - losing progress silently is the worst failure this game has.
      throw new Error(`Could not write save: ${String(error)}`, { cause: error })
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.key)
    } catch {
      // Nothing useful to do; the save is already unreachable.
    }
  }
}

/** In-memory adapter, for tests and for a "no persistence" mode. */
export class MemoryAdapter implements SaveAdapter {
  private data: string | null = null

  async load(): Promise<string | null> {
    return this.data
  }

  async save(data: string): Promise<void> {
    this.data = data
  }

  async clear(): Promise<void> {
    this.data = null
  }
}
