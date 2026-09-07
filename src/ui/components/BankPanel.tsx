import { getItem } from '../../content'
import { burnFuel } from '../../sim/intents'
import type { GameState } from '../../sim/state'
import { formatNumber, formatDuration } from '../format'

const CATEGORY_ORDER = ['fuel', 'material', 'component', 'part'] as const
const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel',
  material: 'Materials',
  component: 'Components',
  part: 'Parts',
}

export function BankPanel({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: (transform: (s: GameState) => GameState) => void
}) {
  const burning = state.boost && state.boost.secondsRemaining > 0 ? state.boost : null
  const held = Object.entries(state.bank).filter(
    (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
  )

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>Bank</h2>
          <p className="dim flavour">
            Everything you have picked up and not yet become.
          </p>
        </div>
      </header>

      {burning && (
        <p className="burning">
          Burning {getItem(burning.source)?.name ?? burning.source} &mdash;{' '}
          <strong>&times;{burning.multiplier} work speed</strong> for{' '}
          {formatDuration(burning.secondsRemaining)}
        </p>
      )}

      {held.length === 0 ? (
        <p className="dim">Empty. Go and take something apart.</p>
      ) : (
        CATEGORY_ORDER.map((category) => {
          const rows = held.filter(([id]) => getItem(id)?.category === category)
          if (rows.length === 0) return null
          return (
            <section key={category}>
              <h3>{CATEGORY_LABELS[category]}</h3>
              <ul className="bank-grid">
                {rows.map(([id, qty]) => {
                  const item = getItem(id)
                  return (
                    <li key={id} className="bank-item" title={item?.description}>
                      <div className="bank-name">{item?.name ?? id}</div>
                      <div className="bank-qty">{formatNumber(qty)}</div>
                      {item?.fuel && (
                        <button
                          className="primary burn"
                          disabled={burning !== null}
                          onClick={() => dispatch((s) => burnFuel(s, id).state)}
                        >
                          {burning ? 'Burning' : `Burn ×${item.fuel.multiplier}`}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
