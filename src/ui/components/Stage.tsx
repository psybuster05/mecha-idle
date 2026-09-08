import { getEnemy, getSkill, itemName } from '../../content'
import { ENEMY_SPRITES, enemySpriteKey } from '../../content/sprites'
import { getNode } from '../../content/world'
import type { GameState } from '../../sim/state'
import { effectiveSpeed } from '../../sim/fuel'
import { waitingFor } from '../../sim/skillEngine'
import { lunge, useMotion, workStroke } from '../useMotion'
import { Bar } from './Bar'
import { PixelSprite } from './PixelSprite'
import { MechPortrait } from './MechPortrait'
import { WorldMap } from './WorldMap'

/** One sprite pixel on the stage. Motion in multiples of this stays crisp. */
const MECH_SCALE = 6

/** A full cycle of the working bob at 1x, in seconds. Divided by the speed toggle. */
const BOB_SECONDS = 1

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
  const activity = state.actors.mech.activity
  // Keyed off the *activity* rather than off there being an enemy right now, so the mech
  // holds its position through respawns instead of sliding back to centre after every
  // kill and out again a second later.
  const fighting = activity?.kind === 'combat'
  const enemy = state.combat.enemyId ? getEnemy(state.combat.enemyId) : null
  const engaged = fighting && enemy !== null

  // An action short of materials is not working, it is waiting, and a mech hammering away
  // on nothing would say the opposite of what the readout below it says.
  const working = activity?.kind === 'skill' && waitingFor(state, 'mech').length === 0

  // One figure, one motion, chosen by what it is doing: leaning into a blow, or bringing
  // something down on the work. Both are the same cue - a timer that just reset.
  const mechMotion = useMotion(
    fighting ? state.combat.attackProgress : state.actors.mech.progress,
    fighting ? engaged : working,
    fighting ? lunge(10) : workStroke(MECH_SCALE),
  )
  const enemyMotion = useMotion(state.combat.enemyAttackProgress, engaged, lunge(-10))

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
          <div ref={mechMotion} className={`stage-figure ${fighting ? 'squared-off' : ''}`}>
            {/* The stroke lands on the figure and the bob on this wrapper, because both
                are transforms: on one element the stroke would override the bob for its
                whole duration and snap the mech straight. Nested, they compose. */}
            <div
              className={working ? 'stage-working' : undefined}
              style={
                working
                  ? { animationDuration: `${BOB_SECONDS / effectiveSpeed(state)}s` }
                  : undefined
              }
            >
              <MechPortrait state={state} scale={MECH_SCALE} caption={false} />
            </div>
          </div>
          {fighting && enemy && (
            <div ref={enemyMotion} className="stage-figure stage-opponent">
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
