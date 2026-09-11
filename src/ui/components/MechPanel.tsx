import { SLOT_ICONS } from '../../content/sprites'
import { getItem, itemName } from '../../content'
import { earnedPerks } from '../../content/enemies'
import { equip, unequip } from '../../sim/intents'
import { EQUIP_SLOTS, type EquipSlot, type GameState } from '../../sim/state'
import { derivedStats } from '../../sim/stats'
import { PixelSprite } from './PixelSprite'
import { formatNumber, formatSeconds } from '../format'
import { statLine } from '../statText'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

const SLOT_LABELS: Record<EquipSlot, string> = {
  frame: 'Frame',
  reactor: 'Reactor',
  arms: 'Arms',
  legs: 'Legs',
  weapon: 'Weapon',
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="dim">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

export function MechPanel({ state, dispatch }: Props) {
  const stats = derivedStats(state)

  // Anything equippable currently sitting in the bank.
  const available = Object.entries(state.bank)
    .filter((entry): entry is [string, number] => (entry[1] ?? 0) > 0)
    .map(([id]) => getItem(id))
    .filter((item) => item?.slot !== undefined)

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>Equipment</h2>
          <p className="dim flavour">
            Every part here is you. There is not much of the original left.
          </p>
        </div>
      </header>

      {/* The gear first, because changing it is what this page is for. It used to come
          last - below a portrait, a stat grid and every boss perk - and at 1366x768 the
          first fitted slot started 1,372px down, two screens of scrolling to reach the one
          thing you came here to do.

          The portrait went entirely. The stage draws the same mech, larger, on every tab,
          so here it was a second copy of the picture taking the top of the page. */}
      <h3>
        Equipped{' '}
        <span className="dim">
          {EQUIP_SLOTS.filter((slot) => state.equipment[slot]).length} of {EQUIP_SLOTS.length}
        </span>
      </h3>
      <ul className="slots">
        {EQUIP_SLOTS.map((slot) => {
          const fitted = state.equipment[slot]
          const item = fitted ? getItem(fitted) : undefined
          return (
            <li key={slot} className={`slot ${fitted ? 'filled' : 'empty'}`}>
              <div className="slot-label dim">
                <PixelSprite layers={[SLOT_ICONS[slot]]} scale={1} className="item-icon" />
                {SLOT_LABELS[slot]}
              </div>
              {item ? (
                <>
                  <div className="slot-item">{item.name}</div>
                  <div className="slot-stats dim">{statLine(item.stats)}</div>
                  <button onClick={() => dispatch((s) => unequip(s, slot))}>Unequip</button>
                </>
              ) : (
                <div className="slot-item dim">empty</div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Directly under the slots: this is what they add up to, so it belongs where you
          can see it change as you swap parts. */}
      <section className="stat-grid">
        <StatLine label="Max HP" value={formatNumber(stats.maxHp)} />
        <StatLine label="Damage" value={formatNumber(stats.damage)} />
        <StatLine label="Accuracy" value={formatNumber(stats.accuracy)} />
        <StatLine label="Armour" value={formatNumber(stats.armour)} />
        <StatLine label="Evasion" value={formatNumber(stats.evasion)} />
        <StatLine label="Attack Speed" value={formatSeconds(stats.attackInterval)} />
      </section>

      <h3>In your bank</h3>
      {available.length === 0 ? (
        <p className="dim">
          Nothing fabricated yet. Refine some stock, then build a frame.
        </p>
      ) : (
        <ul className="parts">
          {available.map((item) => {
            if (!item) return null
            return (
              <li key={item.id} className="part">
                <div>
                  <div className="slot-item">{itemName(item.id)}</div>
                  <div className="dim">
                    {SLOT_LABELS[item.slot as EquipSlot]} &middot; {statLine(item.stats)}
                  </div>
                  <div className="dim flavour">{item.description}</div>
                </div>
                <button
                  className="primary"
                  onClick={() => dispatch((s) => equip(s, item.id).state)}
                >
                  Equip
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* Last: permanent, earned once, and nothing on this page changes them. */}
      {(() => {
        const perks = earnedPerks(state.defeated)
        if (perks.length === 0) return null
        return (
          <>
            <h3>Permanent</h3>
            <ul className="perks">
              {perks.map((perk) => (
                <li key={perk.id} className="perk">
                  <div className="slot-item">{perk.name}</div>
                  <div className="dim flavour">{perk.description}</div>
                  <div className="perk-effects">
                    {[
                      perk.gatheringYield &&
                        `+${Math.round(perk.gatheringYield * 100)}% bonus haul chance`,
                      perk.damageBonus && `+${Math.round(perk.damageBonus * 100)}% damage`,
                      perk.xpBonus && `+${Math.round(perk.xpBonus * 100)}% xp`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      })()}

    </div>
  )
}
