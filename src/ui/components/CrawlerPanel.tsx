import { getSkill } from '../../content'
import { getNode, WORLD_NODES } from '../../content/world'
import { installCrawler, moveCrawler, startSkillAction, stopActivity } from '../../sim/intents'
import { CRAWLER_SKILLS, type GameState } from '../../sim/state'
import { isNodeOpen } from '../../sim/world'
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
 * It carries its workshop, so it never travels to work. Moving it is a separate decision
 * about *where the workshop is*, and it drives slowly enough that the decision matters.
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
              A hauler shell in the back of the Hollow, sitting on its axles. It has been
              here longer than you have been awake, and it is in better condition.
            </p>
          </div>
        </header>

        <p className="dim">
          It needs a drive unit. Build a <strong>Traction Core</strong> at Fabrication
          level 10 and wire it in, and it will work while you are out.
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

  const here = getNode(crawler.at)
  const travel = crawler.travel
  const destination = travel ? getNode(travel.remaining.at(-1) ?? travel.to) : null

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <h2>The Crawler</h2>
          <p className="dim flavour">
            {travel
              ? `On the move. It does not hurry, and it does not work while it is driving.`
              : `Parked at ${here?.name ?? 'nowhere'}. The furnace and the press travel with it.`}
          </p>
        </div>
      </header>

      {travel && (
        <div className="loadout">
          <span className="dim">Driving to</span>
          <span className="my-type">{destination?.name ?? '...'}</span>
          <Bar value={travel.progress / travel.legSeconds} tone="progress" />
        </div>
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
      <p className="dim">
        It stops working while it drives, and it drives slowly. Move it when you are
        changing where you live, not to follow you around.
      </p>
      <ul className="here-list">
        {WORLD_NODES.filter((node) => isNodeOpen(state, node.id)).map((node) => (
          <li key={node.id} className={crawler.at === node.id ? 'active' : undefined}>
            <span>
              <strong>{node.name}</strong>
              {crawler.at === node.id && !travel && <span className="dim"> &middot; parked here</span>}
            </span>
            {crawler.at !== node.id && (
              <button onClick={() => dispatch((s) => moveCrawler(s, node.id))}>Drive here</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
