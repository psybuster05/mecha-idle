import { getSkill } from '../../content'
import { getNode, WORLD_NODES } from '../../content/world'
import { installCrawler, moveTo, startSkillAction, stopActivity } from '../../sim/intents'
import { CRAWLER_SKILLS, type GameState } from '../../sim/state'
import { isNodeOpen } from '../../sim/world'
import { waitingFor } from '../../sim/skillEngine'
import { itemName } from '../../content'
import { levelFromXp } from '../../sim/xp'
import { formatSeconds } from '../format'
import { Bar } from './Bar'

interface Props {
  state: GameState
  dispatch: (transform: (state: GameState) => GameState) => void
}

/**
 * The crawler.
 *
 * The second actor, and the moment the game stops being one-thing-at-a-time. It runs
 * industry while you are out, which is why it only ever offers Refining, Fabrication and
 * Salvaging - the two of you should never be competing for the same job.
 *
 * It carries its workshop, so where it sits never changes what it can build. Parking it
 * is cosmetic now that travel is gone - it is here so the world has two bodies in it
 * rather than one.
 */
export function CrawlerPanel({ state, dispatch }: Props) {
  const crawler = state.actors.crawler
  const hasCore = (state.bank['crawler_core'] ?? 0) > 0

  if (!crawler.unlocked) {
    return (
      <div className="panel">
        <header className="panel-head">
          <div>
            <h2>The Crawler</h2>
            <p className="dim flavour">
              A hauler shell in the back of the Hollow, sitting on its axles. It has been here
              longer than you have been awake, and it is in better condition.
            </p>
          </div>
        </header>

        <p className="dim">
          It needs a drive unit. Build a <strong>Traction Core</strong> at Fabrication level 10 and
          wire it in, and it will work while you are out.
        </p>

        <button
          className="primary"
          disabled={!hasCore}
          onClick={() => dispatch((s) => installCrawler(s).state)}
        >
          {hasCore ? 'Wire in the Traction Core' : 'No Traction Core yet'}
        </button>
      </div>
    )
  }

  const waiting = waitingFor(state, 'crawler')
  const here = getNode(crawler.at)

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>The Crawler</h2>
          <p className="dim flavour">
            Parked at {here?.name ?? 'nowhere'}. The furnace and the press go where it goes.
          </p>
        </div>
      </header>

      {waiting.length > 0 && (
        <p className="warn">
          Out of {waiting.map((stack) => itemName(stack.item)).join(' and ')}. It is still on the
          job and will pick up the moment you bring some back.
        </p>
      )}

      <h3>Work</h3>
      <ul className="actions">
        {CRAWLER_SKILLS.map((skillId) => {
          const skill = getSkill(skillId)
          if (!skill) return null
          const level = levelFromXp(state.skills[skillId])

          return skill.actions
            .filter((action) => action.levelRequired <= level)
            .map((action) => {
              const active =
                crawler.activity?.kind === 'skill' &&
                crawler.activity.skill === skillId &&
                crawler.activity.action === action.id

              return (
                <li key={`${skillId}:${action.id}`} className={`action ${active ? 'active' : ''}`}>
                  <div className="action-main">
                    <div className="action-title">
                      <span className="action-name">{action.name}</span>
                      <span className="dim">{skill.name}</span>
                      <span className="dim">{formatSeconds(action.duration)}</span>
                      <span className="xp-tag">+{action.xp} xp</span>
                    </div>
                    {active && <Bar value={crawler.progress / action.duration} tone="progress" />}
                  </div>
                  <div className="action-side">
                    {active ? (
                      <button onClick={() => dispatch((s) => stopActivity(s, 'crawler'))}>
                        Stop
                      </button>
                    ) : (
                      <button
                        className="primary"
                        onClick={() =>
                          dispatch((s) => startSkillAction(s, skillId, action.id, 'crawler'))
                        }
                      >
                        Start
                      </button>
                    )}
                  </div>
                </li>
              )
            })
        })}
      </ul>

      {CRAWLER_SKILLS.every((skillId) => levelFromXp(state.skills[skillId]) < 1) && (
        <p className="dim">Nothing it can build yet.</p>
      )}

      <h3>Park it</h3>
      <p className="dim">It works just as well anywhere. This is only where you keep it.</p>
      <ul className="here-list">
        {WORLD_NODES.filter((node) => isNodeOpen(state, node.id)).map((node) => (
          <li key={node.id} className={crawler.at === node.id ? 'active' : undefined}>
            <span>
              <strong>{node.name}</strong>
              {crawler.at === node.id && <span className="dim"> &middot; parked here</span>}
            </span>
            {crawler.at !== node.id && (
              <button onClick={() => dispatch((s) => moveTo(s, node.id, 'crawler'))}>
                Park here
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
