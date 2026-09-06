import type { RefObject } from 'react'
import { getNode, WORLD_NODES } from '../../content/world'
import { getSkill, getZone } from '../../content'
import { startCombat, startSkillAction } from '../../sim/intents'
import type { GameState } from '../../sim/state'
import { derivedStats } from '../../sim/stats'
import { findNearest } from '../../sim/world'
import { formatSeconds } from '../format'
import { WorldMap } from './WorldMap'

interface Props {
  state: GameState
  live: RefObject<GameState>
  dispatch: (transform: (state: GameState) => GameState) => void
}

export function WorldPanel({ state, live, dispatch }: Props) {
  const mech = state.actors.mech
  const here = getNode(mech.at)
  const travel = mech.travel
  const destination = travel ? getNode(travel.remaining.at(-1) ?? travel.to) : null
  const speed = derivedStats(state).moveSpeed

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>{travel ? `Travelling to ${destination?.name ?? '...'}` : (here?.name ?? 'Nowhere')}</h2>
          <p className="dim flavour">
            {travel
              ? 'Walking. Nothing gets done on the road.'
              : (here?.description ?? 'You are not anywhere the map knows about.')}
          </p>
        </div>
      </header>

      <WorldMap live={live} />

      {!travel && here && (
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
                      <strong>{def.name}</strong> <span className="dim">{getSkill(skill)?.name}</span>
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

      <h3>Travel</h3>
      <ul className="here-list">
        {WORLD_NODES.filter((node) => node.id !== mech.at).map((node) => {
          const route = findNearest(mech.at, [node.id])
          const seconds = route ? route.length / Math.max(1, speed) : null
          return (
            <li key={node.id}>
              <span>
                <strong>{node.name}</strong>{' '}
                <span className="dim">
                  {seconds === null ? 'unreachable' : `${formatSeconds(seconds)} away`}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="dim">
        Walking speed {speed} units/sec. Thrusters and better legs will cut these times.
      </p>
    </div>
  )
}
