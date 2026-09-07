import { getNode, visibleNodes } from '../../content/world'
import { getEnemy, getSkill, getZone } from '../../content'
import { moveTo, startCombat, startSkillAction } from '../../sim/intents'
import type { GameState } from '../../sim/state'
import { isNodeOpen } from '../../sim/world'
import { WorldMap } from './WorldMap'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

/**
 * Where you are, and everywhere else.
 *
 * Travel used to be the point of this panel - a walk with a cost, a sprite crossing the
 * map. It is gone, because a journey you cannot see is a bill with nothing bought. What
 * is left is what the world was actually for: places hold different work, and some of
 * them are shut until you beat what is holding them.
 *
 * Going somewhere is therefore instant and free. Starting an action from any skill panel
 * moves you on its own; this list exists so the world stays somewhere you can look at
 * rather than something that only happens to you.
 */
export function WorldPanel({ state, dispatch }: Props) {
  const mech = state.actors.mech
  const here = getNode(mech.at)

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>{here?.name ?? 'Nowhere'}</h2>
          <p className="dim flavour">
            {here?.description ?? 'You are not anywhere the map knows about.'}
          </p>
        </div>
      </header>

      <WorldMap state={state} />

      {here && (
        <>
          <h3>Here</h3>
          {here.actions?.length || here.combat ? (
            <ul className="here-list">
              {here.actions?.map(({ skill, action }) => {
                const def = getSkill(skill)?.actions.find((a) => a.id === action)
                if (!def) return null
                const active =
                  mech.activity?.kind === 'skill' &&
                  mech.activity.skill === skill &&
                  mech.activity.action === action
                return (
                  <li key={`${skill}:${action}`} className={active ? 'active' : undefined}>
                    <span>
                      <strong>{def.name}</strong>{' '}
                      <span className="dim">{getSkill(skill)?.name}</span>
                    </span>
                    <button
                      className={active ? undefined : 'primary'}
                      onClick={() => dispatch((s) => startSkillAction(s, skill, action))}
                    >
                      {active ? 'Working' : 'Start'}
                    </button>
                  </li>
                )
              })}
              {here.combat && (
                <li className={mech.activity?.kind === 'combat' ? 'active' : undefined}>
                  <span>
                    <strong>{getZone(here.combat)?.name ?? here.combat}</strong>{' '}
                    <span className="dim">Combat</span>
                  </span>
                  <button
                    className={mech.activity?.kind === 'combat' ? undefined : 'primary'}
                    onClick={() => dispatch((s) => startCombat(s, here.combat!))}
                  >
                    {mech.activity?.kind === 'combat' ? 'Fighting' : 'Fight'}
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <p className="dim">Nothing to do here. Somewhere else, then.</p>
          )}
        </>
      )}

      <h3>Elsewhere</h3>
      <ul className="here-list">
        {visibleNodes((id) => isNodeOpen(state, id))
          .filter((node) => node.id !== mech.at)
          .map((node) => {
            const open = isNodeOpen(state, node.id)
            const gate = node.unlockedBy
              ? (getEnemy(node.unlockedBy)?.name ?? node.unlockedBy)
              : null
            return (
              <li key={node.id}>
                <span>
                  <strong className={open ? undefined : 'dim'}>{node.name}</strong>{' '}
                  {state.actors.crawler.unlocked && state.actors.crawler.at === node.id && (
                    <span className="dim">&middot; crawler parked here</span>
                  )}
                </span>
                {open ? (
                  <button onClick={() => dispatch((s) => moveTo(s, node.id))}>Go</button>
                ) : (
                  <span className="lock">Sealed &middot; {gate ?? 'unknown'}</span>
                )}
              </li>
            )
          })}
      </ul>
    </div>
  )
}
