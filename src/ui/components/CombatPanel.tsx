import { getEnemy, itemName, ZONES } from '../../content'
import { startCombat, stopActivity } from '../../sim/intents'
import type { GameState } from '../../sim/state'
import { combatLevel, derivedStats, RESPAWN_DELAY } from '../../sim/stats'
import { formatNumber, formatSeconds } from '../format'
import { Bar } from './Bar'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

export function CombatPanel({ state, dispatch }: Props) {
  const stats = derivedStats(state)
  const level = combatLevel(state)
  const activity = state.actors.mech.activity
  const deployed = activity?.kind === 'combat' ? activity.zone : null
  const combat = state.combat
  const enemy = combat.enemyId ? getEnemy(combat.enemyId) : null

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>Sorties</h2>
          <p className="dim flavour">
            Threat assessment and fire control. The oldest subroutines you have, and the ones you
            trust least.
          </p>
        </div>
        <div className="level-block">
          <div className="level-number">{level}</div>
          <div className="dim">combat</div>
        </div>
      </header>

      {state.actors.mech.stoppedReason === 'destroyed' && (
        <p className="warn">
          You were destroyed. Emergency repairs are complete, but nothing you were carrying is
          coming back.
        </p>
      )}

      {deployed && (
        <section className="engagement">
          {enemy ? (
            <>
              <div className="combatant">
                <div className="combatant-name">{enemy.name}</div>
                <p className="dim flavour">{enemy.description}</p>
                <Bar
                  value={combat.enemyHp / enemy.maxHp}
                  tone="enemy"
                  label="Integrity"
                  detail={`${formatNumber(Math.max(0, combat.enemyHp))} / ${formatNumber(enemy.maxHp)}`}
                />
                <Bar
                  value={combat.enemyAttackProgress / enemy.attackInterval}
                  tone="progress"
                  label="Next attack"
                  detail={formatSeconds(Math.max(0, enemy.attackInterval - combat.enemyAttackProgress))}
                />
              </div>

              <div className="versus">vs</div>

              <div className="combatant">
                <div className="combatant-name">You</div>
                <p className="dim flavour">
                  {formatNumber(stats.damage)} damage &middot; {formatNumber(stats.accuracy)} accuracy
                  &middot; {formatNumber(stats.armour)} armour
                </p>
                <Bar
                  value={combat.hp / stats.maxHp}
                  tone="integrity"
                  label="Integrity"
                  detail={`${formatNumber(Math.max(0, combat.hp))} / ${formatNumber(stats.maxHp)}`}
                />
                <Bar
                  value={combat.attackProgress / stats.attackInterval}
                  tone="progress"
                  label="Next attack"
                  detail={formatSeconds(Math.max(0, stats.attackInterval - combat.attackProgress))}
                />
              </div>
            </>
          ) : (
            <div className="scanning">
              <div className="combatant-name">Scanning</div>
              <Bar value={combat.respawnProgress / RESPAWN_DELAY} tone="progress" />
              <p className="dim">Something is always still moving out there.</p>
            </div>
          )}
        </section>
      )}

      <ul className="actions">
        {ZONES.map((zone) => {
          const locked = level < zone.levelRequired
          const active = deployed === zone.id
          return (
            <li key={zone.id} className={`action ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
              <div className="action-main">
                <div className="action-title">
                  <span className="action-name">{zone.name}</span>
                </div>
                <p className="dim flavour">{zone.description}</p>
                <ul className="enemy-list">
                  {zone.enemies.map((id) => {
                    const def = getEnemy(id)
                    if (!def) return null
                    return (
                      <li key={id}>
                        <span className="enemy-name">{def.name}</span>
                        <span className="dim">
                          {def.maxHp} hp &middot; {def.damage} dmg &middot; +{def.xp} xp
                        </span>
                        <span className="dim drops">
                          {[...(def.guaranteed ?? []), ...(def.drops ?? [])]
                            .map((d) => itemName(d.item))
                            .join(', ')}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="action-side">
                {locked ? (
                  <span className="lock">Combat {zone.levelRequired}</span>
                ) : active ? (
                  <button onClick={() => dispatch((s) => stopActivity(s))}>Withdraw</button>
                ) : (
                  <button className="primary" onClick={() => dispatch((s) => startCombat(s, zone.id))}>
                    Deploy
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
