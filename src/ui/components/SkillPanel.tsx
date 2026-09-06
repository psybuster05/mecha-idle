import { getSkill, itemName } from '../../content'
import type { SkillAction } from '../../content/types'
import { count } from '../../sim/bank'
import { startSkillAction, stopActivity } from '../../sim/intents'
import type { GameState, GatheringSkillId } from '../../sim/state'
import { levelFromXp, levelProgress, xpForLevel } from '../../sim/xp'
import { formatNumber, formatSeconds } from '../format'
import { Bar } from './Bar'

interface Props {
  state: GameState
  skillId: GatheringSkillId
  dispatch: (transform: (state: GameState) => GameState) => void
}

function ItemList({ state, stacks, kind }: { state: GameState; stacks: { item: string; qty: number }[]; kind: 'in' | 'out' }) {
  return (
    <ul className={`stacks stacks-${kind}`}>
      {stacks.map((stack) => {
        const held = count(state, stack.item)
        const short = kind === 'in' && held < stack.qty
        return (
          <li key={stack.item} className={short ? 'short' : undefined}>
            <span className="qty">{stack.qty}</span>
            <span>{itemName(stack.item)}</span>
            {kind === 'in' && <span className="dim held">({formatNumber(held)} held)</span>}
          </li>
        )
      })}
    </ul>
  )
}

export function SkillPanel({ state, skillId, dispatch }: Props) {
  const skill = getSkill(skillId)
  if (!skill) return <p className="warn">Unknown skill: {skillId}</p>

  const xp = state.skills[skillId]
  const level = levelFromXp(xp)
  const activity = state.actors.mech.activity
  const stopped = state.actors.mech.stoppedReason

  const isActive = (action: SkillAction) =>
    activity?.kind === 'skill' && activity.skill === skillId && activity.action === action.id

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

      <Bar
        value={levelProgress(xp)}
        tone="xp"
        label={`${formatNumber(xp)} xp`}
        detail={level < 99 ? `${formatNumber(xpForLevel(level + 1) - xp)} to level ${level + 1}` : 'mastered'}
      />

      {stopped === 'missing-inputs' && (
        <p className="warn">Materials ran out. Restock, then start again.</p>
      )}

      <ul className="actions">
        {skill.actions.map((action) => {
          const locked = level < action.levelRequired
          const active = isActive(action)
          const progress = active ? state.actors.mech.progress / action.duration : 0

          return (
            <li key={action.id} className={`action ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
              <div className="action-main">
                <div className="action-title">
                  <span className="action-name">{action.name}</span>
                  <span className="dim">{formatSeconds(action.duration)}</span>
                  <span className="xp-tag">+{action.xp} xp</span>
                </div>
                <p className="dim flavour">{action.description}</p>

                <div className="recipe">
                  {action.inputs && <ItemList state={state} stacks={action.inputs} kind="in" />}
                  {action.inputs && <span className="arrow">-&gt;</span>}
                  <ItemList state={state} stacks={action.outputs} kind="out" />
                  {action.drops?.map((drop) => (
                    <span key={drop.item} className="drop-tag">
                      {itemName(drop.item)} {Math.round(drop.chance * 100)}%
                    </span>
                  ))}
                </div>

                {active && <Bar value={progress} tone="progress" />}
              </div>

              <div className="action-side">
                {locked ? (
                  <span className="lock">Level {action.levelRequired}</span>
                ) : active ? (
                  <button onClick={() => dispatch((s) => stopActivity(s))}>Stop</button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => dispatch((s) => startSkillAction(s, skillId, action.id))}
                  >
                    Start
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
