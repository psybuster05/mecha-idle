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
