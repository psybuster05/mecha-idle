import type { SkillId } from '../sim/state'

/**
 * Pre-made saves, so a tester can see a stage of the game they have not played to.
 *
 * This is the answer to a gap the pace note already admits: *"Pace alone cannot put a
 * boss in front of a fifteen-minute visitor; only a starting save with progress on it
 * would."* Ten times faster still leaves the second region twenty minutes out and the
 * endgame hours out, and somebody given a link will give it fifteen minutes.
 *
 * They are **stages, not difficulties**. Each is a plausible snapshot of somebody's
 * playthrough - levels, bosses down, gear fitted, a bank with something in it - so what
 * a tester pokes at is the real game at that point rather than a sandbox with the
 * numbers turned up.
 *
 * Levels here, never xp. Xp is the storage format; a level is the thing anybody reading
 * this can judge, and `buildPreset` converts.
 */

export interface PresetDef {
  id: 'mid' | 'end'
  /** What the slot is called in the picker. */
  name: string
  /** One line under it, saying what you are being dropped into. */
  blurb: string
  /** Levels, by skill. Anything unlisted stays at 1. */
  levels: Partial<Record<SkillId, number>>
  /** In kill order. The next boss along is the one left in front of you. */
  defeated: readonly string[]
  crawler: boolean
  /** How much of every material to hand over, so nothing is waiting on arrival. */
  stock: number
}

export const PRESETS: readonly PresetDef[] = [
  {
    id: 'mid',
    name: 'Mid-game',
    blurb: 'Two regions open, the crawler running, tier-three gear fitted.',
    // Fabrication 60 rather than 50 on purpose: 60 is a gear tier, and at 50 the best
    // frame in the game is still the level-1 welded steel one. A "mid-game" save whose
    // chassis is the tutorial's chassis reads as a bug.
    levels: {
      scavenging: 60,
      refining: 60,
      fabrication: 60,
      salvaging: 55,
      attack: 50,
      strength: 50,
      defence: 48,
      hitpoints: 52,
      ranged: 40,
    },
    defeated: ['overseer', 'quartermaster'],
    crawler: true,
    stock: 2500,
  },
  {
    id: 'end',
    name: 'Endgame',
    blurb: 'Six bosses down, best gear in the game, the Colonel still standing.',
    // Six of seven, deliberately. A save with every boss dead has nothing left to show
    // but the credits; this one has the last fight in front of you, which is the part
    // worth being dropped into.
    levels: {
      scavenging: 92,
      refining: 92,
      fabrication: 92,
      salvaging: 90,
      // Chosen against the last zone's requirement rather than picked for looking
      // high: The Switch Room asks for combat level 95, and 90 across the board built a
      // save that could not get into the room its own blurb promises.
      attack: 96,
      strength: 96,
      defence: 94,
      hitpoints: 96,
      ranged: 92,
    },
    defeated: ['overseer', 'quartermaster', 'tower_actual', 'registrar', 'census', 'adjutant'],
    crawler: true,
    stock: 40_000,
  },
]

export function getPreset(id: string): PresetDef | undefined {
  return PRESETS.find((preset) => preset.id === id)
}
