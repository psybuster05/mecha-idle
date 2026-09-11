import type { CombatStyleId } from '../content/skills/combat'
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

export type GatheringSkillId =
  'scavenging' | 'refining' | 'fabrication' | 'salvaging'
export type CombatSkillId = 'attack' | 'strength' | 'defence' | 'hitpoints' | 'ranged'
export type SkillId = GatheringSkillId | CombatSkillId

export const GATHERING_SKILLS: readonly GatheringSkillId[] = [
  'scavenging',
  'refining',
  'fabrication',
  'salvaging',
]
export const COMBAT_SKILLS: readonly CombatSkillId[] = [
  'attack',
  'strength',
  'defence',
  'hitpoints',
  'ranged',
]
export const ALL_SKILLS: readonly SkillId[] = [...GATHERING_SKILLS, ...COMBAT_SKILLS]

/**
 * What the crawler can run.
 *
 * Industry only. It is a workshop on tracks - it carries the furnace and the press with
 * it, so it never has to travel to reach them - and keeping it to these three means the
 * two actors are never competing for the same job. The mech goes out; the crawler works.
 */
export const CRAWLER_SKILLS: readonly GatheringSkillId[] = ['refining', 'fabrication', 'salvaging']

export function canCrawlerRun(skill: GatheringSkillId): boolean {
  return CRAWLER_SKILLS.includes(skill)
}

export type ItemId = string
export type NodeId = string

/**
 * How damage is delivered.
 *
 * Three axes, because a boss phase that can only raise a number is just a bigger
 * enemy. With types, a phase can invert which weapon is correct mid-fight, which is
 * what makes preparation the actual gameplay.
 *
 * - kinetic: mass and impact. Shrugged off by heavy plate.
 * - energy:  beams and heat. Melts armour, defeated by ablative coatings.
 * - emp:     electrical disruption. Ruins fine electronics, poor against hardened units.
 */
export type DamageType = 'kinetic' | 'energy' | 'emp'

export const DAMAGE_TYPES: readonly DamageType[] = ['kinetic', 'energy', 'emp']

/** Multiplier on incoming damage per type. 1 is neutral, below 1 resists, above 1 hurts. */
export type Resistances = Partial<Record<DamageType, number>>

/** Bare fists, when nothing is fitted. */
export const DEFAULT_DAMAGE_TYPE: DamageType = 'kinetic'
export type ActionId = string
export type ZoneId = string

export type EquipSlot = 'frame' | 'reactor' | 'arms' | 'legs' | 'weapon'

export const EQUIP_SLOTS: readonly EquipSlot[] = ['frame', 'reactor', 'arms', 'legs', 'weapon']

// ---------------------------------------------------------------------------
// Actors and activities
// ---------------------------------------------------------------------------

/** What an actor is currently doing. `null` means idle. */
export type Activity =
  | { kind: 'skill'; skill: GatheringSkillId; action: ActionId }
  | {
      kind: 'combat'
      zone: ZoneId
      /** A specific target. Omitted means take whatever the zone spawns. */
      enemy?: string
    }

/** Why an activity stopped on its own, so the UI can say so rather than silently idling. */
export type StopReason =
  'missing-inputs' | 'level-too-low' | 'unknown-action' | 'destroyed' | 'unreachable'

export interface ActorState {
  unlocked: boolean
  activity: Activity | null
  /** Seconds accumulated toward the current activity's next completion. */
  progress: number
  /** Set when an activity halted itself. Cleared whenever a new activity starts. */
  stoppedReason: StopReason | null
  /**
   * Where this actor is.
   *
   * Kept after travel was removed, because places still gate content - a node behind a
   * boss is still shut - and the map still shows the world opening up. Getting there is
   * simply instant now: this is a menu game, and a walk you cannot watch was a cost with
   * no feedback.
   */
  at: NodeId
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
  /** Current HP. Max is derived from the Hitpoints skill + equipment. */
  hp: number
  /** Seconds until our next swing. */
  attackProgress: number
  /** Seconds remaining before the next enemy spawns, after a kill. */
  respawnProgress: number
  /**
   * Overkill banked by a cleaving weapon, spent on the next enemy the moment it
   * arrives. Bounded by a single hit, so it cannot accumulate.
   */
  carryOver: number
  /**
   * Which combat skill a fight trains. See `content/skills/combat.ts`.
   *
   * Every style pays the same total xp, so this changes where training lands and never
   * how fast it arrives. Stored rather than derived because it is a standing preference,
   * and it survives a save like any other choice.
   */
  style: CombatStyleId
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

/**
 * Narrative progress.
 *
 * `pending` is what has fired but not yet been read; `seen` is what has. The
 * simulation only ever moves ids from nothing into `pending` - the UI decides when
 * something has been read, because that is a presentation question.
 */
export interface StoryState {
  /** Fired, not yet shown. In the order they fired. */
  pending: string[]
  /** Already delivered. */
  seen: string[]
}

/**
 * A burst of speed bought with a rare find.
 *
 * Fuel is a drop, not an economy: you stumble on it, you burn it, non-combat work runs
 * two or three times faster until it is gone. Nothing to manage between sessions, which
 * is the point - a treat rather than a chore.
 */
/**
 * Where the speed toggle is set: 1x, 2x or 3x.
 *
 * A standing preference rather than a running effect. It stays where the player put it
 * when the tank empties, so finding fuel later resumes at the speed they asked for
 * instead of silently at 1x. What is actually running is `effectiveSpeed()`.
 */
export type Speed = 1 | 2 | 3

export const SAVE_VERSION = 7

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
  /**
   * Every place ever reached.
   *
   * Recorded on arrival rather than derived from where you are now, because "where you
   * are" is not monotonic: you move on, and a story beat keyed on having been somewhere
   * would never fire again. Monotonic facts are the only safe triggers.
   */
  visited: NodeId[]
  /** Narrative progress. Reads from the world; the world never reads from it. */
  story: StoryState
  /** Burning fuel, or null. */
  /** Where the speed toggle is set. See sim/fuel.ts. */
  speed: Speed
  /**
   * Energy in the tank, part-used. Whole items live in the bank until they are needed.
   *
   * Split this way so fuel is a visible, countable drop right up until the moment it is
   * spent, rather than vanishing into an invisible pool the moment it is picked up.
   */
  fuelEnergy: number
  /**
   * Bosses beaten, and how many times.
   *
   * The count rather than a bare flag, because it costs nothing and distinguishes the
   * *first* kill - which is what story beats and one-off rewards key off - from repeat
   * farming. Only bosses are recorded; a log of every trash kill would grow without
   * bound and serve nothing.
   *
   * This is the first persistent progress that is neither a level nor an item, and
   * region unlocks, perks, story and NG+ all read from it.
   */
  defeated: Partial<Record<string, number>>
  /**
   * Which weapon to fight each boss phase with: boss id -> phase key -> weapon.
   *
   * A phase left out, a boss left out, or a weapon you no longer own all mean "whatever is
   * fitted", so an empty object is exactly the game as it was before plans existed. See
   * `weaponPlan.ts` - the plan changes what the fight *sees*, never what is equipped.
   */
  weaponPlans: Partial<Record<string, Partial<Record<string, ItemId>>>>
}

/**
 * Kept in sync with STARTING_NODE in content/world.ts by a test - sim/ cannot import
 * from content/ at runtime without creating a cycle.
 */
export const DEFAULT_START_NODE: NodeId = 'the_hollow'

function idleActor(unlocked: boolean): ActorState {
  return {
    unlocked,
    activity: null,
    progress: 0,
    stoppedReason: null,
    at: DEFAULT_START_NODE,
  }
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
    visited: [DEFAULT_START_NODE],
    story: { pending: [], seen: [] },
    speed: 1,
    fuelEnergy: 0,
    defeated: {},
    weaponPlans: {},
    combat: {
      enemyId: null,
      enemyHp: 0,
      enemyAttackProgress: 0,
      hp: 0,
      attackProgress: 0,
      respawnProgress: 0,
      carryOver: 0,
      style: 'balanced',
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
  return (Object.keys(state.actors) as ActorId[]).filter((id) => state.actors[id].activity !== null)
}

/** Whether `actor` may start a new activity right now. */
export function canStartActivity(state: GameState, actor: ActorId): boolean {
  if (!state.actors[actor].unlocked) return false
  if (state.actors[actor].activity !== null) return true // switching is always allowed
  return busyActors(state).length < maxConcurrentActivities(state)
}

export const ACTOR_IDS: readonly ActorId[] = ['mech', 'crawler']

/** Mutates. Records arriving somewhere, if it is the first time. */
export function recordVisit(state: GameState, node: NodeId): void {
  if (!state.visited.includes(node)) state.visited.push(node)
}

/** Mutates. Queues a story beat, unless it has already fired or been read. */
export function queueStoryBeat(state: GameState, id: string): boolean {
  if (state.story.seen.includes(id) || state.story.pending.includes(id)) return false
  state.story.pending.push(id)
  return true
}

/** Mutates. Marks a queued beat as read. */
export function markStorySeen(state: GameState, id: string): void {
  state.story.pending = state.story.pending.filter((pending) => pending !== id)
  if (!state.story.seen.includes(id)) state.story.seen.push(id)
}

/** Whether a boss has ever been beaten. */
export function hasDefeated(state: GameState, bossId: string): boolean {
  return (state.defeated[bossId] ?? 0) > 0
}

/** Mutates. Records a kill and reports whether it was the first. */
export function recordDefeat(state: GameState, bossId: string): boolean {
  const previous = state.defeated[bossId] ?? 0
  state.defeated[bossId] = previous + 1
  return previous === 0
}

/**
 * Point an actor at a new activity. Mutates.
 *
 * Returns false if the concurrency rule forbids it (see maxConcurrentActivities).
 * Progress and any previous stop reason are reset - switching actions abandons
 * partial progress, which is the Melvor behaviour and keeps the rule easy to reason about.
 */
export function setActivity(
  state: GameState,
  actorId: ActorId,
  activity: Activity | null,
): boolean {
  if (activity !== null && !canStartActivity(state, actorId)) return false
  const actor = state.actors[actorId]
  actor.activity = activity
  actor.progress = 0
  actor.stoppedReason = null
  return true
}

/** Mutates. Halts an actor and records why, so the UI can explain the stop. */
export function haltActivity(state: GameState, actorId: ActorId, reason: StopReason): void {
  const actor = state.actors[actorId]
  actor.activity = null
  actor.progress = 0
  actor.stoppedReason = reason
}
