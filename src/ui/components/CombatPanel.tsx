import { getEnemy, itemName, ZONES } from '../../content'
import { activePhase, effectiveResistances, type EnemyDef } from '../../content/enemies'
import { hasDefeated } from '../../sim/state'
import { setCombatStyle, setWeaponPlan, startCombat, stopActivity } from '../../sim/intents'
import { BRANCH_SKILLS, COMBAT_STYLES, getCombatSkill } from '../../content/skills/combat'
import { DAMAGE_TYPES, type DamageType, type GameState } from '../../sim/state'
import { combatBranch, combatLevel, derivedStats, RESPAWN_DELAY } from '../../sim/stats'
import { formatNumber, formatSeconds } from '../format'
import { Bar } from './Bar'
import { PixelSprite } from './PixelSprite'
import { MechPortrait } from './MechPortrait'
import { DAMAGE_ICONS, ENEMY_SPRITES, enemySpriteKey } from '../../content/sprites'
import { dossier, TYPE_NAME, verdict } from '../dossier'
import { getRecord } from '../../content/records'
import { getItem } from '../../content'
import { fightingAs, OPENING, ownedWeapons, ownsWeapon } from '../../sim/weaponPlan'
import { DEFAULT_DAMAGE_TYPE } from '../../sim/state'
import { getStoryBeat } from '../../content/story'

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
            <PixelSprite layers={[DAMAGE_ICONS[type]]} scale={1} className="item-icon" />
            <span className="resist-type">{TYPE_LABEL[type]}</span>
            <span className="resist-value">&times;{value.toFixed(2)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The boss's own record - the document it has been keeping for thirty-one years.
 *
 * Read from outside, before the fight, it is the boss's procedure: how it will fight, one
 * entry per phase, written in its own document's terms - the Overseer's schedule has
 * shifts, the Quartermaster's manifest has lines. That is the practical half, and it keeps
 * every plain number the fight turns on: when each phase arrives, what it changes, and
 * whether your weapon lands.
 *
 * One entry is sealed. On defeat it opens, and what is inside is the story beat that
 * defeat plays - the same beat object the Log holds, rendered here rather than copied - so
 * the thing most worth reading before a boss and the story it guards are one document.
 *
 * Open until the boss has fallen once, then collapsed: the first attempt is where the
 * reading matters, and afterwards it is reference - and a place to reread what you found.
 */
/** What a weapon deals. Bare hands - no weapon - are kinetic, as everywhere else. */
function weaponType(id: string | undefined): DamageType {
  return (id && getItem(id)?.stats?.damageType) || DEFAULT_DAMAGE_TYPE
}

function BossRecord({
  enemy,
  state,
  dispatch,
}: {
  enemy: EnemyDef
  state: GameState
  dispatch: Props['dispatch']
}) {
  const fitted = state.equipment.weapon
  const mine = weaponType(fitted)
  const plan = state.weaponPlans[enemy.id] ?? {}
  const weapons = ownedWeapons(state)
  const steps = dossier(enemy)
  const record = getRecord(enemy.id)
  const beaten = hasDefeated(state, enemy.id)
  const sealed = record ? getStoryBeat(record.beat) : undefined
  // A boss without a record still gets its phases - the practical half must never depend
  // on the story half being written. A test keeps every boss supplied anyway.
  const entry = record?.entry ?? 'Phase'

  return (
    <details className="dossier record" open={!beaten}>
      <summary>
        {record ? record.document : 'Record'}{' '}
        <span className="dim">
          &middot; kept by {enemy.name} &middot; {steps.length - 1} phases &middot; you deal{' '}
          {TYPE_NAME[mine]}
        </span>
      </summary>
      <ol className="dossier-steps">
        {steps.map((step, index) => {
          // The plan key for this entry: the opening, or the phase by name.
          const key = index === 0 ? OPENING : step.name
          const planned = plan[key]
          // The verdict follows what this entry will actually be fought with, so choosing
          // a weapon here answers "is that right?" before the fight ever starts.
          const using = planned && ownsWeapon(state, planned) ? planned : fitted
          const call = verdict(step.resistances, weaponType(using))
          return (
            <li key={step.name} className="dossier-step">
              <div className="dossier-head">
                <span className="dossier-at">
                  {entry} {index + 1} &middot; {step.at}
                </span>
                <strong>{step.name}</strong>
                <span className="dim">deals {TYPE_NAME[step.damageType]}</span>
              </div>
              {step.message && <p className="dim flavour">{step.message}</p>}
              {step.effects.length > 0 && (
                <p className="dossier-effects">{step.effects.join(' · ')}</p>
              )}
              <Resistances resistances={step.resistances} mine={weaponType(using)} />
              {call && <p className={`dossier-verdict ${call.tone}`}>{call.text}</p>}
              {/* The switch. Blank means "whatever is fitted", so a plan only ever *adds* a
                  change and an untouched record is exactly the fight as it always was. */}
              <label className="plan-row">
                <span className="dim">Fight with</span>
                <select
                  className="plan-select"
                  value={planned ?? ''}
                  onChange={(e) =>
                    dispatch((s) => setWeaponPlan(s, enemy.id, key, e.target.value || null))
                  }
                >
                  <option value="">
                    Fitted weapon{fitted ? ` (${getItem(fitted)?.name ?? fitted})` : ' (bare hands)'}
                  </option>
                  {weapons.map((id) => (
                    <option key={id} value={id}>
                      {getItem(id)?.name ?? id} &middot; {TYPE_NAME[weaponType(id)]}
                    </option>
                  ))}
                  {/* A plan can name a weapon you have not built yet, or have salvaged.
                      Shown so the choice is not silently lost, and marked so it is clear
                      it will do nothing until you have one. */}
                  {planned && !weapons.includes(planned) && (
                    <option value={planned}>{getItem(planned)?.name ?? planned} (not owned)</option>
                  )}
                </select>
              </label>
            </li>
          )
        })}
        {sealed && (
          <li className={`record-sealed ${beaten ? 'open' : ''}`}>
            {beaten ? (
              <>
                <div className="dossier-head">
                  <span className="dossier-at">
                    {entry} {steps.length + 1} &middot; recovered
                  </span>
                  <strong>{sealed.title}</strong>
                </div>
                {sealed.body.map((paragraph, i) => (
                  <p key={i} className="story-line">
                    {paragraph}
                  </p>
                ))}
              </>
            ) : (
              // Says only that something is there. Hinting at *whose* entry it is would
              // spoil the first one, where finding yourself on the record is the moment.
              <p className="dim">
                <span className="dossier-at">
                  {entry} {steps.length + 1} &middot; sealed
                </span>{' '}
                One entry will not open from out here. It opens when {enemy.name} falls.
              </p>
            )}
          </li>
        )}
      </ol>
    </details>
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
        scale={enemy.isBoss ? 3 : 2}
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
        {enemy.isBoss && <BossRecord enemy={enemy} state={state} dispatch={dispatch} />}
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
  // What the fight sees: during a planned phase, that is the planned weapon.
  const stats = derivedStats(fightingAs(state))
  const level = combatLevel(state)
  const branch = combatBranch(state)
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

      {/* Sits above the engagement because it is a standing decision, not something you
          do to the fight in front of you - and it can be changed mid-fight, since it
          only decides where the next kill's xp lands. */}
      <h3>Attack style</h3>
      <p className="dim">
        Fighting as <strong className="my-type">{branch}</strong>, from the weapon you have
        fitted. {branch === 'ranged' ? 'Ranged' : 'Attack and Strength'} supplies your
        accuracy and damage.
      </p>
      <ul className="styles">
        {COMBAT_STYLES.map((style) => {
          const active = state.combat.style === style.id
          const focus = style.trains[branch]
          const trains = focus
            ? getCombatSkill(focus)?.name
            : BRANCH_SKILLS[branch].map((s) => getCombatSkill(s)?.name).join(' + ')
          return (
            <li key={style.id}>
              <button
                className={`style ${active ? 'active' : ''}`}
                onClick={() => dispatch((s) => setCombatStyle(s, style.id))}
                aria-pressed={active}
              >
                <span className="style-head">
                  <strong>{style.name}</strong>
                  <span className="xp-tag">{trains}</span>
                </span>
                <span className="style-effect">
                  {style.effects
                    ? Object.entries(style.effects)
                        .map(([stat, mult]) => `+${Math.round((mult - 1) * 100)}% ${stat}`)
                        .join(' · ')
                    : 'No combat bonus - it buys combat level instead'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="dim">
        Every style pays the same xp - it only decides which skill gets it. Hitpoints
        trains either way.
      </p>

      <div className="loadout">
        <span className="dim">Dealing</span>
        <PixelSprite layers={[DAMAGE_ICONS[stats.damageType]]} scale={1} className="item-icon" />
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
