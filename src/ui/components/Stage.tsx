import { getEnemy, getSkill, itemName } from '../../content'
import { ENEMY_SPRITES, enemySpriteKey } from '../../content/sprites'
import { getNode } from '../../content/world'
import type { GameState } from '../../sim/state'
import { waitingFor } from '../../sim/skillEngine'
import { Bar } from './Bar'
import { PixelSprite } from './PixelSprite'
import { MechPortrait } from './MechPortrait'
import { WorldMap } from './WorldMap'

/**
 * The permanent view of what is actually happening.
 *
 * This replaced the World tab. That tab was a map plus two lists, and once travel was
 * deleted both lists were dead weight - the actions duplicated the skill panels, and
 * "go here" changed nothing the simulation reads. What it had that nothing else did was
 * the picture.
 *
 * So the picture stopped being a place you navigate to and became a column that is
 * always there. A tabbed panel can only ever show you one thing; this shows you the two
 * that are true regardless of which tab you are on - what you are made of, and what you
 * are doing right now.
 */
export function Stage({ state }: { state: GameState }) {
  return (
    <aside className="stage">
      <div className="stage-portrait">
        <MechPortrait state={state} scale={6} />
      </div>

      <NowPlaying state={state} />

      <div className="stage-map">
        <WorldMap state={state} />
        <p className="stage-caption dim">
          {getNode(state.actors.mech.at)?.name ?? 'Nowhere'}
          {state.actors.crawler.unlocked &&
            ` · crawler at ${getNode(state.actors.crawler.at)?.name ?? 'nowhere'}`}
        </p>
      </div>
    </aside>
  )
}

/**
 * What the mech is doing, in the smallest honest form.
 *
 * Deliberately not a second combat panel. It answers "is anything happening, and how
 * far along is it" - the question you have while looking at some other tab - and leaves
 * the detail to the panel that owns it.
 */
function NowPlaying({ state }: { state: GameState }) {
  const activity = state.actors.mech.activity
  const stopped = state.actors.mech.stoppedReason

  if (!activity) {
    return (
      <div className="stage-now">
        <p className="dim">
          {stopped ? 'Stopped.' : 'Idle.'}
          {state.actors.crawler.activity ? ' The crawler is working.' : ''}
        </p>
      </div>
    )
  }

  if (activity.kind === 'combat') {
    const enemy = state.combat.enemyId ? getEnemy(state.combat.enemyId) : null
    return (
      <div className="stage-now">
        {enemy ? (
          <>
            <div className="stage-enemy">
              <PixelSprite
                layers={[ENEMY_SPRITES[enemySpriteKey(enemy)]]}
                scale={3}
                title={enemy.name}
              />
              <span className="stage-enemy-name">{enemy.name}</span>
            </div>
            <Bar value={Math.max(0, state.combat.enemyHp) / enemy.maxHp} tone="enemy" />
          </>
        ) : (
          <p className="dim">Between targets.</p>
        )}
      </div>
    )
  }

  const action = getSkill(activity.skill)?.actions.find((a) => a.id === activity.action)
  const waiting = waitingFor(state, 'mech')

  return (
    <div className="stage-now">
      <div className="stage-action">
        <span>{action?.name ?? activity.action}</span>
        <span className="dim">{getSkill(activity.skill)?.name}</span>
      </div>
      {waiting.length > 0 ? (
        <p className="warn">
          Waiting for {waiting.map((stack) => itemName(stack.item)).join(' and ')}.
        </p>
      ) : (
        <Bar value={action ? state.actors.mech.progress / action.duration : 0} tone="progress" />
      )}
    </div>
  )
}
