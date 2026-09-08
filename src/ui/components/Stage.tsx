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
  // Keyed off the *activity* rather than off there being an enemy right now, so the mech
  // holds its position through respawns instead of sliding back to centre after every
  // kill and out again a second later.
  const fighting = state.actors.mech.activity?.kind === 'combat'
  const enemy = state.combat.enemyId ? getEnemy(state.combat.enemyId) : null

  return (
    <aside className="stage">
      {/* Scrolls on its own so the map below can hold the corner. Without this split
          the pinned map simply covered whatever it overlapped. */}
      <div className="stage-body">
        {/* A place rather than an inventory readout. Two rectangles - ground inside
            sky - is enough to stop the mech floating in the panel background, which is
            what made this read as a slice of the equipment page. */}
        <div className="stage-scene">
          <div className="stage-sky" />
          <div className="stage-ground" />
          <div className={`stage-figure ${fighting ? 'squared-off' : ''}`}>
            <MechPortrait state={state} scale={6} caption={false} />
          </div>
          {fighting && enemy && (
            <div className="stage-figure stage-opponent">
              {/* A boss standing the same height as a Scrap Crawler undersells the
                  moment. The slab is only so wide, so this is as far as it goes without
                  the two of them overlapping. */}
              <PixelSprite
                layers={[ENEMY_SPRITES[enemySpriteKey(enemy)]]}
                scale={enemy.isBoss ? 8 : 6}
                title={enemy.name}
              />
            </div>
          )}
        </div>

        <NowPlaying state={state} />
      </div>

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
            <span className="stage-enemy-name">{enemy.name}</span>
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
