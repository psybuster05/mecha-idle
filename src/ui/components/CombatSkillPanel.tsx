import { getCombatSkill } from '../../content/skills/combat'
import type { CombatSkillId, GameState } from '../../sim/state'
import { combatLevel, derivedStats } from '../../sim/stats'
import { levelFromXp, levelProgress, xpForLevel } from '../../sim/xp'
import { formatNumber } from '../format'
import { Bar } from './Bar'

/**
 * One combat skill.
 *
 * These levels were being earned and never shown: every fight pays xp into all four, and
 * before Combat had its own section there was no screen anywhere that said what Attack
 * was, what it was for, or what level you had reached.
 *
 * So this answers the three questions the rail cannot: what it is, what a level buys, and
 * what it has bought you so far. There is nothing to *do* here - combat skills train by
 * fighting, which is what the Combat panel is for.
 */
export function CombatSkillPanel({
  state,
  skillId,
}: {
  state: GameState
  skillId: CombatSkillId
}) {
  const skill = getCombatSkill(skillId)
  if (!skill) return <p className="warn">No such skill.</p>

  const xp = state.skills[skillId]
  const level = levelFromXp(xp)
  const stats = derivedStats(state)

  // What this skill is currently contributing, as opposed to what equipment adds. The
  // split is the whole point: it is how you tell "I need levels" from "I need parts".
  const contribution = (perLevel: number) => level * perLevel

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>{skill.name}</h2>
          <p className="dim flavour">{skill.description}</p>
        </div>
        <div className="level-block">
          <div className="level-number">{level}</div>
          <div className="dim">level</div>
        </div>
      </header>

      <div className="bar-label">
        <span>{formatNumber(Math.floor(xp))} xp</span>
        <span className="dim">
          {level >= 99
            ? 'maxed'
            : `${formatNumber(Math.ceil(xpForLevel(level + 1) - xp))} to level ${level + 1}`}
        </span>
      </div>
      <Bar value={levelProgress(xp)} tone="xp" />

      <h3>What it gives you</h3>
      <div className="stat-grid">
        {skill.grants.map((grant) => (
          <div key={grant.stat} className="stat">
            <span className="stat-name dim">
              {grant.stat} <span className="xp-tag">+{grant.perLevel}/level</span>
            </span>
            <span className="stat-value">+{formatNumber(contribution(grant.perLevel))}</span>
          </div>
        ))}
      </div>

      <h3>Where that lands</h3>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-name dim">Max HP</span>
          <span className="stat-value">{formatNumber(stats.maxHp)}</span>
        </div>
        <div className="stat">
          <span className="stat-name dim">Accuracy</span>
          <span className="stat-value">{formatNumber(stats.accuracy)}</span>
        </div>
        <div className="stat">
          <span className="stat-name dim">Damage</span>
          <span className="stat-value">{formatNumber(stats.damage)}</span>
        </div>
        <div className="stat">
          <span className="stat-name dim">Evasion</span>
          <span className="stat-value">{formatNumber(stats.evasion)}</span>
        </div>
        <div className="stat">
          <span className="stat-name dim">Armour</span>
          <span className="stat-value">{formatNumber(stats.armour)}</span>
        </div>
        <div className="stat">
          <span className="stat-name dim">Combat level</span>
          <span className="stat-value">{combatLevel(state)}</span>
        </div>
      </div>

      <p className="dim">
        These are the totals after equipment. Combat level is the average of all four
        combat skills, and it is what gates the zones.
      </p>
    </div>
  )
}
