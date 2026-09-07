import { getEnemy, itemName, ZONES } from '../../content'
import { activePhase, effectiveResistances, type EnemyDef } from '../../content/enemies'
import { hasDefeated } from '../../sim/state'
import { startCombat, stopActivity } from '../../sim/intents'
import { DAMAGE_TYPES, type DamageType, type GameState } from '../../sim/state'
import { combatLevel, derivedStats, RESPAWN_DELAY } from '../../sim/stats'
import { formatNumber, formatSeconds } from '../format'
import { Bar } from './Bar'
import { PixelSprite } from './PixelSprite'
import { MechPortrait } from './MechPortrait'
import { ENEMY_SPRITES, enemySpriteKey } from '../../content/sprites'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

const TYPE_LABEL: Record<DamageType, string> = {
  kinetic: 'KIN',
  energy: 'NRG',
  emp: 'EMP',
}

/**
 * A resistance read-out, with the player's own damage type picked out.
 *
 * This is the whole reason damage types exist, so it has to be legible at a glance:
 * you should be able to see "my weapon is the wrong one here" without doing sums.
 */
function Resistances({
  resistances,
  mine,
}: {
  resistances: Partial<Record<DamageType, number>>
  mine?: DamageType
}) {
  return (
    <ul className="resists">
      {DAMAGE_TYPES.map((type) => {
        const value = resistances[type] ?? 1
        const tone = value > 1.05 ? 'weak' : value < 0.95 ? 'strong' : 'neutral'
        return (
          <li key={type} className={`resist ${tone} ${mine === type ? 'mine' : ''}`}>
            <span className="resist-type">{TYPE_LABEL[type]}</span>
            <span className="resist-value">&times;{value.toFixed(2)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function EnemyRow({
  enemy,
  state,
  active,
  dispatch,
  zone,
}: {
  enemy: EnemyDef
  state: GameState
  active: boolean
  zone: string
  dispatch: Props['dispatch']
}) {
  const mine = derivedStats(state).damageType
  return (
    <li className={`enemy-row ${active ? 'active' : ''} ${enemy.isBoss ? 'boss' : ''}`}>
      <PixelSprite
        layers={[ENEMY_SPRITES[enemySpriteKey(enemy)]]}
        scale={2}
        className="enemy-thumb"
        title={enemy.name}
      />
      <div className="enemy-main">
        <div className="enemy-title">
          <strong>{enemy.name}</strong>
          {enemy.isBoss && <span className="boss-tag">BOSS</span>}
          {enemy.isBoss && hasDefeated(state, enemy.id) && (
            <span className="beaten-tag">
              BEATEN &times;{state.defeated[enemy.id]}
            </span>
          )}
          <span className="dim">
            {formatNumber(enemy.maxHp)} hp &middot; {enemy.damage} {TYPE_LABEL[enemy.damageType]} &middot;
            +{enemy.xp} xp
          </span>
        </div>
        <p className="dim flavour">{enemy.description}</p>
        <Resistances resistances={enemy.resistances ?? {}} mine={mine} />
        {enemy.perk && (
          <div className={`perk-note ${hasDefeated(state, enemy.id) ? 'earned' : ''}`}>
            <strong>{enemy.perk.name}</strong>
            <span className="dim"> — {enemy.perk.description}</span>
          </div>
        )}
        <div className="dim drops">
          {[...(enemy.guaranteed ?? []), ...(enemy.drops ?? [])]
            .map((d) => itemName(d.item))
            .join(', ')}
        </div>
      </div>
      <div className="action-side">
        {active ? (
          <button onClick={() => dispatch((s) => stopActivity(s))}>Stop</button>
        ) : (
          <button className="primary" onClick={() => dispatch((s) => startCombat(s, zone, enemy.id))}>
            Fight
          </button>
        )}
      </div>
    </li>
  )
}

export function CombatPanel({ state, dispatch }: Props) {
  const stats = derivedStats(state)
  const level = combatLevel(state)
  const activity = state.actors.mech.activity
  const deployed = activity?.kind === 'combat' ? activity.zone : null
  const target = activity?.kind === 'combat' ? activity.enemy : undefined
  const combat = state.combat
  const enemy = combat.enemyId ? getEnemy(combat.enemyId) : null
  const phase = enemy ? activePhase(enemy, combat.enemyHp) : null
  const respawnDelay =
    (deployed ? ZONES.find((z) => z.id === deployed)?.respawnDelay : undefined) ?? RESPAWN_DELAY

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>Combat</h2>
          <p className="dim flavour">
            The oldest instincts you have, and the ones you trust least.
          </p>
        </div>
        <div className="level-block">
          <div className="level-number">{level}</div>
          <div className="dim">level</div>
        </div>
      </header>

      <div className="loadout">
        <span className="dim">Dealing</span>
        <span className="my-type">{TYPE_LABEL[stats.damageType]}</span>
        <span className="dim">&middot; resisting</span>
        <Resistances resistances={stats.resistances} />
      </div>

      {state.actors.mech.stoppedReason === 'destroyed' && (
        <p className="warn">
          You were destroyed. Emergency repairs are complete. Whatever beat you will beat
          you again unless something changes.
        </p>
      )}

      {deployed && (
        <section className="engagement">
          {enemy ? (
            <>
              <div className="combatant">
                <div className="combatant-head">
                  <PixelSprite
                    layers={[ENEMY_SPRITES[enemySpriteKey(enemy)]]}
                    scale={3}
                    title={enemy.name}
                  />
                  <div className="combatant-name">{enemy.name}</div>
                </div>
                {phase && (
                  <div className="phase-banner">
                    <strong>{phase.name}</strong>
                    <span className="dim"> — {phase.message}</span>
                  </div>
                )}
                <Bar
                  value={combat.enemyHp / enemy.maxHp}
                  tone="enemy"
                  label="HP"
                  detail={`${formatNumber(Math.max(0, combat.enemyHp))} / ${formatNumber(enemy.maxHp)}`}
                />
                <Resistances
                  resistances={effectiveResistances(enemy, combat.enemyHp)}
                  mine={stats.damageType}
                />
                <Bar
                  value={combat.enemyAttackProgress / enemy.attackInterval}
                  tone="progress"
                  label="Next attack"
                  detail={formatSeconds(
                    Math.max(0, enemy.attackInterval - combat.enemyAttackProgress),
                  )}
                />
              </div>

              <div className="versus">vs</div>

              <div className="combatant">
                <div className="combatant-head">
                  <MechPortrait state={state} scale={3} />
                  <div className="combatant-name">You</div>
                </div>
                <p className="dim flavour">
                  {formatNumber(stats.damage)} {TYPE_LABEL[stats.damageType]} &middot;{' '}
                  {formatNumber(stats.accuracy)} accuracy &middot; {formatNumber(stats.armour)} armour
                </p>
                <Bar
                  value={combat.hp / stats.maxHp}
                  tone="hp"
                  label="HP"
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
              <div className="combatant-name">Finding a target</div>
              <Bar value={combat.respawnProgress / respawnDelay} tone="progress" />
              <p className="dim">Something is always still moving out there.</p>
            </div>
          )}
        </section>
      )}

      {ZONES.map((zone) => {
        const locked = level < zone.levelRequired
        return (
          <section key={zone.id} className={`zone ${locked ? 'locked' : ''}`}>
            <h3>{zone.name}</h3>
            <p className="dim flavour">{zone.description}</p>
            {locked ? (
              <p className="lock">Requires combat level {zone.levelRequired}</p>
            ) : (
              <ul className="enemy-rows">
                {zone.enemies.map((id) => {
                  const def = getEnemy(id)
                  if (!def) return null
                  return (
                    <EnemyRow
                      key={id}
                      enemy={def}
                      state={state}
                      zone={zone.id}
                      active={deployed === zone.id && target === id}
                      dispatch={dispatch}
                    />
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
