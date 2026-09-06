import { getItem, itemName } from '../../content'
import { equip, unequip } from '../../sim/intents'
import { EQUIP_SLOTS, type EquipSlot, type GameState } from '../../sim/state'
import { derivedStats } from '../../sim/stats'
import { formatNumber, formatSeconds } from '../format'

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
          <h2>Chassis</h2>
          <p className="dim flavour">
            Every part here is you. There is not much of the original left.
          </p>
        </div>
      </header>

      <section className="stat-grid">
        <StatLine label="Max integrity" value={formatNumber(stats.maxHp)} />
        <StatLine label="Damage" value={formatNumber(stats.damage)} />
        <StatLine label="Accuracy" value={formatNumber(stats.accuracy)} />
        <StatLine label="Armour" value={formatNumber(stats.armour)} />
        <StatLine label="Evasion" value={formatNumber(stats.evasion)} />
        <StatLine label="Attack every" value={formatSeconds(stats.attackInterval)} />
      </section>

      <h3>Fitted</h3>
      <ul className="slots">
        {EQUIP_SLOTS.map((slot) => {
          const fitted = state.equipment[slot]
          const item = fitted ? getItem(fitted) : undefined
          return (
            <li key={slot} className={`slot ${fitted ? 'filled' : 'empty'}`}>
              <div className="slot-label dim">{SLOT_LABELS[slot]}</div>
              {item ? (
                <>
                  <div className="slot-item">{item.name}</div>
                  <div className="slot-stats dim">
                    {Object.entries(item.stats ?? {})
                      .map(([stat, value]) => `+${value} ${stat}`)
                      .join(' · ')}
                  </div>
                  <button onClick={() => dispatch((s) => unequip(s, slot))}>Remove</button>
                </>
              ) : (
                <div className="slot-item dim">empty</div>
              )}
            </li>
          )
        })}
      </ul>

      <h3>In storage</h3>
      {available.length === 0 ? (
        <p className="dim">
          Nothing fabricated yet. Refine some stock, then build a frame.
        </p>
      ) : (
        <ul className="parts">
          {available.map((item) => {
            if (!item) return null
            const isFitted = state.equipment[item.slot as EquipSlot] === item.id
            return (
              <li key={item.id} className="part">
                <div>
                  <div className="slot-item">{itemName(item.id)}</div>
                  <div className="dim">
                    {SLOT_LABELS[item.slot as EquipSlot]} &middot;{' '}
                    {Object.entries(item.stats ?? {})
                      .map(([stat, value]) => `+${value} ${stat}`)
                      .join(' · ')}
                  </div>
                  <div className="dim flavour">{item.description}</div>
                </div>
                <button
                  className="primary"
                  onClick={() => dispatch((s) => equip(s, item.id).state)}
                >
                  {isFitted ? 'Fit another' : 'Fit'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
