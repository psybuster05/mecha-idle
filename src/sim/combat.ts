/**
 * Combat.
 *
 * Stepped event by event rather than in fixed slices: each iteration advances to
 * whichever happens next - our swing, the enemy's swing, or a respawn - and resolves
 * it. That keeps the ordering of events (and therefore of RNG rolls) identical no
 * matter how large a dt arrives, which is what lets eight hours of offline combat be
 * simulated accurately in a few milliseconds.
 */

import { getEnemy, getZone } from '../content'
import type { EnemyDef } from '../content/enemies'
import { addItem, grantAll } from './bank'
import { Rng } from './rng'
import { haltActivity, type ActorId, type GameState } from './state'
import { combatLevel, derivedStats, HEAL_ON_KILL, RESPAWN_DELAY, type DerivedStats } from './stats'

/** Float slack when comparing accumulated progress against an interval. */
const EPS = 1e-9
/** Backstop against a pathological content table producing a zero-length event loop. */
const MAX_EVENTS_PER_CALL = 5_000_000

/**
 * Resolve one swing. Returns damage dealt, or 0 on a miss.
 *
 * Accuracy is opposed against evasion, so a flat accuracy bonus matters more against
 * weak enemies and less against strong ones - which keeps low zones from staying
 * optimal forever.
 */
function swing(
  rng: Rng,
  accuracy: number,
  damage: number,
  evasion: number,
  armour: number,
): number {
  const hitChance = accuracy / (accuracy + evasion)
  if (!rng.chance(hitChance)) return 0
  const roll = 0.8 + rng.next() * 0.4
  // A landed hit always does at least 1, so armour can never make a fight unwinnable
  // outright - only slow enough that you notice and go build something better.
  return Math.max(1, Math.round(damage * roll - armour))
}

/** Mutates. Rolls the next enemy in the zone and puts it on the field. */
function spawnEnemy(state: GameState, enemyIds: readonly string[], rng: Rng): void {
  const combat = state.combat
  const picked = enemyIds[rng.int(0, enemyIds.length - 1)]
  const enemy = picked ? getEnemy(picked) : undefined
  if (!enemy) {
    combat.enemyId = null
    return
  }
  combat.enemyId = enemy.id
  combat.enemyHp = enemy.maxHp
  combat.enemyAttackProgress = 0
  combat.respawnProgress = 0
}

/** Mutates. Awards xp and loot, heals, and clears the field. */
function onKill(state: GameState, enemy: EnemyDef, stats: DerivedStats, rng: Rng): void {
  state.skills.attack += enemy.xp
  state.skills.strength += enemy.xp
  state.skills.defence += enemy.xp
  state.skills.hitpoints += Math.round(enemy.xp * 0.4)

  if (enemy.guaranteed) grantAll(state, enemy.guaranteed, 1)
  for (const drop of enemy.drops ?? []) {
    if (rng.chance(drop.chance)) addItem(state, drop.item, drop.qty)
  }

  const combat = state.combat
  combat.hp = Math.min(stats.maxHp, combat.hp + stats.maxHp * HEAL_ON_KILL)
  combat.enemyId = null
  combat.enemyHp = 0
  combat.enemyAttackProgress = 0
  combat.respawnProgress = 0
}

/** Mutates. Advances the combat `actorId` is engaged in by `dt` seconds. */
export function advanceCombatActivity(state: GameState, actorId: ActorId, dt: number): void {
  const actor = state.actors[actorId]
  const activity = actor.activity
  if (activity?.kind !== 'combat') return

  const zone = getZone(activity.zone)
  if (!zone || zone.enemies.length === 0) {
    haltActivity(state, actorId, 'unknown-action')
    return
  }
  if (combatLevel(state) < zone.levelRequired) {
    haltActivity(state, actorId, 'level-too-low')
    return
  }

  // Recomputed after every kill, never cached across the whole call: combat xp levels
  // the mech up mid-fight, and a large offline dt must feel those level-ups exactly
  // when live play would. Caching this for the whole step silently under-credits
  // anyone who levelled while away.
  let stats = derivedStats(state)
  const combat = state.combat

  // Deploying with no integrity left starts you patched up; equipment changes that
  // lower max HP clamp you down rather than leaving an impossible value.
  if (combat.hp <= 0) combat.hp = stats.maxHp
  combat.hp = Math.min(combat.hp, stats.maxHp)

  const rng = new Rng(state.rngSeed)
  let remaining = dt
  let guard = 0

  while (remaining > EPS && guard++ < MAX_EVENTS_PER_CALL) {
    // --- Between enemies -------------------------------------------------
    if (!combat.enemyId) {
      const untilSpawn = Math.max(0, RESPAWN_DELAY - combat.respawnProgress)
      const step = Math.min(remaining, untilSpawn)
      combat.respawnProgress += step
      remaining -= step
      if (combat.respawnProgress >= RESPAWN_DELAY - EPS) spawnEnemy(state, zone.enemies, rng)
      continue
    }

    const enemy = getEnemy(combat.enemyId)
    if (!enemy) {
      combat.enemyId = null
      continue
    }

    // --- Advance to the next swing, whoever's it is ------------------------
    const untilOurs = Math.max(0, stats.attackInterval - combat.attackProgress)
    const untilTheirs = Math.max(0, enemy.attackInterval - combat.enemyAttackProgress)
    const step = Math.min(remaining, untilOurs, untilTheirs)

    combat.attackProgress += step
    combat.enemyAttackProgress += step
    remaining -= step

    // Ours resolves first on a tie. A deliberate sliver of player advantage.
    if (combat.attackProgress >= stats.attackInterval - EPS) {
      combat.attackProgress = 0
      combat.enemyHp -= swing(rng, stats.accuracy, stats.damage, enemy.evasion, enemy.armour)
      if (combat.enemyHp <= 0) {
        onKill(state, enemy, stats, rng)
        stats = derivedStats(state)
        continue
      }
    }

    if (combat.enemyAttackProgress >= enemy.attackInterval - EPS) {
      combat.enemyAttackProgress = 0
      combat.hp -= swing(rng, enemy.accuracy, enemy.damage, stats.evasion, stats.armour)
      if (combat.hp <= 0) {
        // Destroyed. Idling stops so the player finds out, and we patch back up so
        // redeploying does not immediately fail again.
        combat.hp = stats.maxHp
        combat.enemyId = null
        combat.enemyHp = 0
        combat.enemyAttackProgress = 0
        combat.attackProgress = 0
        combat.respawnProgress = 0
        haltActivity(state, actorId, 'destroyed')
        break
      }
    }
  }

  state.rngSeed = rng.seed
}
