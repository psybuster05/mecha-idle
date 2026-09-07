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
import { getCombatStyle, styleShare } from '../content/skills/combat'
import { combatBranch } from './stats'
import { activePhase, effectiveResistances, perkTotal, type EnemyDef } from '../content/enemies'
import type { DamageType, Resistances } from './state'
import { addItem, grantAll } from './bank'
import { Rng } from './rng'
import { haltActivity, recordDefeat, type ActorId, type GameState } from './state'
import {
  combatLevel,
  derivedStats,
  HEAL_ON_KILL,
  HP_REGEN_PER_SECOND,
  PHASE_TRANSITION_HEAL,
  RESPAWN_DELAY,
  type DerivedStats,
} from './stats'

/** Float slack when comparing accumulated progress against an interval. */
const EPS = 1e-9
/**
 * Governs how quickly armour reaches diminishing returns: reduction is
 * armour / (armour + this). Higher means armour matters less.
 *
 * Armour used to subtract flatly, which does not scale. Defence 60 gave 48 armour
 * against enemies hitting for 18-34, so a mid-level mech was outright immune and the
 * whole late game became free. A ratio can approach total mitigation but never reach
 * it - the same reason accuracy is opposed against evasion rather than subtracted.
 */
export const ARMOUR_SCALE = 60

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
  type: DamageType,
  evasion: number,
  armour: number,
  resistances: Resistances,
  pierce = 0,
): number {
  const hitChance = accuracy / (accuracy + evasion)
  if (!rng.chance(hitChance)) return 0
  const roll = 0.8 + rng.next() * 0.4

  // Resistance scales the raw damage, then armour mitigates a share of what is left.
  // Both are multiplicative, so a good matchup and heavy plate compound rather than
  // one washing the other out.
  const typed = damage * roll * (resistances[type] ?? 1)
  const effectiveArmour = Math.max(0, armour * (1 - pierce))
  const mitigation = 1 - effectiveArmour / (effectiveArmour + ARMOUR_SCALE)

  // A landed hit always does at least 1, so a bad matchup can never make a fight
  // literally unwinnable - only slow enough that you notice and go build an answer.
  return Math.max(1, Math.round(typed * mitigation))
}

/** Mutates. Rolls the next enemy in the zone and puts it on the field. */
function spawnEnemy(
  state: GameState,
  enemyIds: readonly string[],
  rng: Rng,
  target?: string,
): void {
  const combat = state.combat
  // A named target is fought exclusively - that is how bosses are reached, since
  // bosses are excluded from random spawns entirely.
  let picked: string | undefined
  if (target && enemyIds.includes(target)) {
    picked = target
  } else {
    const spawnable = enemyIds.filter((id) => !getEnemy(id)?.isBoss)
    const pool = spawnable.length > 0 ? spawnable : enemyIds
    picked = pool[rng.int(0, pool.length - 1)]
  }
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
  // Bosses are recorded before xp so the very kill that earns a perk is not itself
  // boosted by it - the reward starts from the next action, which is easier to reason
  // about and keeps the first kill reproducible.
  if (enemy.isBoss) recordDefeat(state, enemy.id)

  const xp = enemy.xp * (1 + perkTotal(state.defeated, 'xpBonus'))

  // A focused style hands one skill what the branch's set would have shared, so the
  // total is identical whatever is picked and whichever branch is fighting. Routing
  // without that would have cut combat training and silently re-gated every zone,
  // since zones read combat level.
  const style = getCombatStyle(state.combat.style)
  if (style) {
    for (const { skill, amount } of styleShare(style, combatBranch(state), xp)) {
      state.skills[skill] += amount
    }
  }
  // Hitpoints is outside the choice: everything hitting you trains it.
  state.skills.hitpoints += Math.round(xp * 0.4)

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

  // How fast the next one steps forward. A crowded zone sets its own.
  const respawnDelay = zone.respawnDelay ?? RESPAWN_DELAY

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
      const untilSpawn = Math.max(0, respawnDelay - combat.respawnProgress)
      const step = Math.min(remaining, untilSpawn)
      combat.respawnProgress += step
      remaining -= step
      combat.hp = Math.min(stats.maxHp, combat.hp + stats.maxHp * HP_REGEN_PER_SECOND * step)
      if (combat.respawnProgress >= respawnDelay - EPS) {
        spawnEnemy(state, zone.enemies, rng, activity.enemy)

        const arrived = combat.enemyId ? getEnemy(combat.enemyId) : undefined
        if (arrived && combat.carryOver > 0) {
          combat.enemyHp -= combat.carryOver
          combat.carryOver = 0
          if (combat.enemyHp <= 0) {
            if (stats.cleave > 0) {
              combat.carryOver = Math.max(0, -combat.enemyHp) * stats.cleave
            }
            onKill(state, arrived, stats, rng)
            stats = derivedStats(state)
          }
        }
      }
      continue
    }

    const enemy = getEnemy(combat.enemyId)
    if (!enemy) {
      combat.enemyId = null
      continue
    }

    // --- Advance to the next swing, whoever's it is ------------------------
    // Boss phases are derived from current HP, so they take effect the instant the
    // threshold is crossed - no stored phase to fall out of step with the health bar.
    const phase = activePhase(enemy, combat.enemyHp)
    const enemyInterval = enemy.attackInterval * (phase?.attackIntervalMultiplier ?? 1)
    const enemyDamage = enemy.damage * (phase?.damageMultiplier ?? 1)
    const enemyType = phase?.damageType ?? enemy.damageType
    const enemyEvasion = enemy.evasion * (phase?.evasionMultiplier ?? 1)
    const enemyArmour = enemy.armour * (phase?.armourMultiplier ?? 1)

    const untilOurs = Math.max(0, stats.attackInterval - combat.attackProgress)
    const untilTheirs = Math.max(0, enemyInterval - combat.enemyAttackProgress)
    const step = Math.min(remaining, untilOurs, untilTheirs)

    combat.attackProgress += step
    combat.enemyAttackProgress += step
    remaining -= step

    // Enemy regeneration, applied per step so it competes with incoming damage in
    // real time rather than arriving in a lump.
    if (phase?.regenPerSecond) {
      combat.enemyHp = Math.min(
        enemy.maxHp,
        combat.enemyHp + enemy.maxHp * phase.regenPerSecond * step,
      )
    }
    // Regenerate inside the loop rather than once per call, so healing interleaves
    // with incoming hits exactly as it would in live play.
    combat.hp = Math.min(stats.maxHp, combat.hp + stats.maxHp * HP_REGEN_PER_SECOND * step)

    // Ours resolves first on a tie. A deliberate sliver of player advantage.
    if (combat.attackProgress >= stats.attackInterval - EPS) {
      combat.attackProgress = 0

      combat.enemyHp -= swing(
        rng,
        stats.accuracy,
        stats.damage,
        stats.damageType,
        enemyEvasion,
        enemyArmour,
        effectiveResistances(enemy, combat.enemyHp),
        stats.armourPierce,
      )
      // Crossing a threshold buys a breather - the boss steps back to reconfigure.
      // Derived from HP like the phase itself, so nothing can fall out of step.
      if (combat.enemyHp > 0 && activePhase(enemy, combat.enemyHp) !== phase) {
        combat.hp = Math.min(stats.maxHp, combat.hp + stats.maxHp * PHASE_TRANSITION_HEAL)
      }

      if (combat.enemyHp <= 0) {
        // Everything past zero is waste unless the weapon cleaves, in which case it
        // is banked and spent on whatever arrives next.
        if (stats.cleave > 0) {
          combat.carryOver += Math.max(0, -combat.enemyHp) * stats.cleave
        }

        onKill(state, enemy, stats, rng)
        stats = derivedStats(state)
        continue
      }
    }

    if (combat.enemyAttackProgress >= enemyInterval - EPS) {
      combat.enemyAttackProgress = 0
      combat.hp -= swing(
        rng,
        enemy.accuracy,
        enemyDamage,
        enemyType,
        stats.evasion,
        stats.armour,
        stats.resistances,
      )
      if (combat.hp <= 0) {
        // Destroyed. Idling stops so the player finds out, and we patch back up so
        // redeploying does not immediately fail again.
        combat.hp = stats.maxHp
        combat.enemyId = null
        combat.enemyHp = 0
        combat.enemyAttackProgress = 0
        combat.attackProgress = 0
        combat.respawnProgress = 0
        combat.carryOver = 0
        haltActivity(state, actorId, 'destroyed')
        break
      }
    }
  }

  state.rngSeed = rng.seed
}
