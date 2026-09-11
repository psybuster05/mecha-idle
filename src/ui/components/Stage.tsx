import type { CSSProperties } from 'react'
import { getEnemy, getSkill, itemName } from '../../content'
import { activePhase } from '../../content/enemies'
import { getItem } from '../../content'
import { plannedWeapon } from '../../sim/weaponPlan'
import {
  ENEMY_SPRITES,
  SCENE_BACKDROP,
  SCENE_GROUND_ROW,
  enemySpriteKey,
} from '../../content/sprites'
import { getNode } from '../../content/world'
import type { GameState } from '../../sim/state'
import { effectiveSpeed } from '../../sim/fuel'
import { waitingFor } from '../../sim/skillEngine'
import { lunge, SPRITE_PIXEL, useMotion, WORK_STYLES } from '../useMotion'
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

  // One figure, one motion, chosen by what it is doing: leaning into a blow, or working
  // in whichever way that skill works. Both are the same cue - a timer that just reset.
  const style = activity?.kind === 'skill' ? WORK_STYLES[activity.skill] : null
  const mechMotion = useMotion(
    fighting ? state.combat.attackProgress : state.actors.mech.progress,
    fighting ? engaged : working,
    fighting || !style ? lunge(10) : style.stroke,
  )
  const enemyMotion = useMotion(state.combat.enemyAttackProgress, engaged, lunge(-10))

  return (
    <aside className="stage">
      {/* Scrolls on its own so the map below can hold the corner. Without this split
          the pinned map simply covered whatever it overlapped. */}
      <div className="stage-body">
        {/* A place, drawn. The sky stays a CSS gradient because a gradient is what a
            sky is, and the backdrop's top third is transparent so it shows through -
            the art starts where the horizon does. */}
        <div
          className="stage-scene"
          // Read off the art, never guessed: the surface is this far up from the bottom
          // of a backdrop that is bottom-anchored, so this is where feet go.
          style={{ '--ground': `${(SCENE_BACKDROP.rows.length - SCENE_GROUND_ROW) * SPRITE_PIXEL}px` } as CSSProperties}
        >
          <div className="stage-sky" />
          <PixelSprite
            layers={[SCENE_BACKDROP]}
            scale={SPRITE_PIXEL}
            className="stage-backdrop"
          />
          <div ref={mechMotion} className={`stage-figure ${fighting ? 'squared-off' : ''}`}>
            {/* The stroke lands on the figure and the bob on this wrapper, because both
                are transforms: on one element the stroke would override the bob for its
                whole duration and snap the mech straight. Nested, they compose. */}
            <div
              className={working && style ? `stage-working ${style.bob}` : undefined}
              style={
                working && style
                  ? { animationDuration: `${style.bobSeconds / effectiveSpeed(state)}s` }
                  : undefined
              }
            >
              <MechPortrait state={state} scale={SPRITE_PIXEL} caption={false} />
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
        </p>
      </div>
    )
  }

  if (activity.kind === 'combat') {
    const enemy = state.combat.enemyId ? getEnemy(state.combat.enemyId) : null
    const phase = enemy ? activePhase(enemy, state.combat.enemyHp) : null
    // Named on the stage because a switch is otherwise invisible: the sprite does not
    // change, and the only evidence would be numbers moving on a tab you are not on.
    const switched = plannedWeapon(state)
    return (
      <div className="stage-now">
        {enemy ? (
          <>
            <span className="stage-enemy-name">{enemy.name}</span>
            {/* The phase, where an idle player is actually looking. A phase change is
                the whole point of the boss design - it is what inverts which weapon is
                right - and it used to be visible only on the Combat tab, which a
                player with the game on a second screen is almost never on.

                Keyed by name so each new phase mounts fresh and plays its flash once:
                the change is the event worth seeing, not the phase sitting there. And a
                live region, so a screen reader announces the shift rather than leaving
                it to be discovered. */}
            {phase && (
              <div key={phase.name} className="phase-banner stage-phase" role="status">
                <strong>{phase.name}</strong>
                <span className="dim"> — {phase.message}</span>
                {switched && (
                  <div className="stage-switch">Switched to {getItem(switched)?.name ?? switched}</div>
                )}
              </div>
            )}
            {!phase && switched && (
              <div className="stage-switch">Fighting with {getItem(switched)?.name ?? switched}</div>
            )}
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
