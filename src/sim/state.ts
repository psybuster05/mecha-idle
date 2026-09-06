/**
 * The complete game state, and the rules for what a valid state looks like.
 *
 * Everything here is plain data - no classes with behaviour, no functions stored in
 * state - so it can be structured-cloned, serialised to a save, and diffed in tests.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/**
 * Actors are the things that can be *doing* something.
 *
 * `crawler` is not reachable in v1, but it is modelled from the start on purpose:
 * the plan is a salvaged mobile base you dock into, which excavates and refines
 * while the mech fights. Encoding that as a second actor now - rather than a single
 * global "current action" - means unlocking it later is a data change, not a rewrite
 * of every system that touches actions.
 */
export type ActorId = 'mech' | 'crawler'

export type GatheringSkillId = 'scavenging' | 'refining' | 'fabrication'
export type CombatSkillId = 'targeting' | 'servos' | 'plating' | 'structure'
export type SkillId = GatheringSkillId | CombatSkillId

export const GATHERING_SKILLS: readonly GatheringSkillId[] = [
  'scavenging',
  'refining',
  'fabrication',
]
export const COMBAT_SKILLS: readonly CombatSkillId[] = [
  'targeting',
  'servos',
  'plating',
  'structure',
]
export const ALL_SKILLS: readonly SkillId[] = [...GATHERING_SKILLS, ...COMBAT_SKILLS]

export type ItemId = string
export type ActionId = string
export type ZoneId = string

export type EquipSlot = 'frame' | 'reactor' | 'arms' | 'legs' | 'weapon'

export const EQUIP_SLOTS: readonly EquipSlot[] = [
  'frame',
  'reactor',
  'arms',
  'legs',
  'weapon',
]

// ---------------------------------------------------------------------------
// Actors and activities
// ---------------------------------------------------------------------------

/** What an actor is currently doing. `null` means idle. */
export type Activity =
  | { kind: 'skill'; skill: GatheringSkillId; action: ActionId }
  | { kind: 'combat'; zone: ZoneId }

export interface ActorState {
  unlocked: boolean
  activity: Activity | null
  /** Seconds accumulated toward the current activity's next completion. */
  progress: number
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export interface CombatState {
  /** The enemy currently engaged, or null between spawns. */
  enemyId: string | null
  enemyHp: number
  /** Seconds until the enemy's next swing. */
  enemyAttackProgress: number
  /** Current mech integrity. Max is derived from the Structure skill + equipment. */
  hp: number
  /** Seconds until our next swing. */
  attackProgress: number
  /** Seconds remaining before the next enemy spawns, after a kill. */
  respawnProgress: number
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export const SAVE_VERSION = 1

export interface GameState {
  /** Bumped whenever the shape changes; drives migrations in save.ts. */
  version: number
  /** Total simulated seconds since the game began. */
  elapsed: number
  /** Epoch ms of the last save. Owned by the save layer; used for offline catch-up. */
  savedAt: number
  /** Seed for the deterministic PRNG. See rng.ts. */
  rngSeed: number

  actors: Record<ActorId, ActorState>
  /** Total xp per skill. Levels are derived, never stored. */
  skills: Record<SkillId, number>
  /** Item counts. Absent key means zero. */
  bank: Partial<Record<ItemId, number>>
  equipment: Partial<Record<EquipSlot, ItemId>>
  combat: CombatState
}

function idleActor(unlocked: boolean): ActorState {
  return { unlocked, activity: null, progress: 0 }
}

export function newGame(seed: number = 1): GameState {
  const skills = {} as Record<SkillId, number>
  for (const skill of ALL_SKILLS) skills[skill] = 0

  return {
    version: SAVE_VERSION,
    elapsed: 0,
    savedAt: 0,
    rngSeed: seed,
    actors: {
      mech: idleActor(true),
      // Salvaged much later in the progression. See the ActorId doc comment.
      crawler: idleActor(false),
    },
    skills,
    bank: {},
    equipment: {},
    combat: {
      enemyId: null,
      enemyHp: 0,
      enemyAttackProgress: 0,
      hp: 0,
      attackProgress: 0,
      respawnProgress: 0,
    },
  }
}

/** Deep copy. `tick` uses this so the sim reads as pure from the outside. */
export function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

// ---------------------------------------------------------------------------
// Concurrency rule
// ---------------------------------------------------------------------------

/**
 * How many actors may be busy at once.
 *
 * v1 is Melvor-style: exactly one action at a time, so every choice carries real
 * opportunity cost. Once the crawler is salvaged this becomes 2 - the mech fights
 * while the crawler works. Expressed as a rule over `actors` rather than baked into
 * the state shape, which is the whole point of modelling actors separately.
 */
export function maxConcurrentActivities(state: GameState): number {
  return state.actors.crawler.unlocked ? 2 : 1
}

export function busyActors(state: GameState): ActorId[] {
  return (Object.keys(state.actors) as ActorId[]).filter(
    (id) => state.actors[id].activity !== null,
  )
}

/** Whether `actor` may start a new activity right now. */
export function canStartActivity(state: GameState, actor: ActorId): boolean {
  if (!state.actors[actor].unlocked) return false
  if (state.actors[actor].activity !== null) return true // switching is always allowed
  return busyActors(state).length < maxConcurrentActivities(state)
}
