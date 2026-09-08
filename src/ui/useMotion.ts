import { useEffect, useRef } from 'react'
import type { GatheringSkillId } from '../sim/state'

/**
 * Makes a figure react to its own timer.
 *
 * **The cue is a *fall* in the timer.** Combat's attack clock counts up to the interval
 * and resets; a skill action's progress counts up to its duration and drops by it. Either
 * way the reset is what tells the view that something just happened - the simulation
 * announces nothing, exactly as with item gains, and stays unaware that anything is drawn
 * at all.
 *
 * Driven through the Web Animations API rather than a CSS class, for one practical
 * reason: replaying a CSS animation means removing the class, forcing a reflow and
 * putting it back, or remounting the element - and remounting would tear down and redraw
 * the sprite canvas on every swing. `animate()` just restarts.
 */
export interface Motion {
  keyframes: Keyframe[]
  /** Milliseconds. Long enough to see, short enough to finish before the next one. */
  duration: number
  easing?: string
}

/** One sprite pixel on the stage, in screen pixels. The bob keyframes assume it too. */
export const SPRITE_PIXEL = 6

/** Leaning into a blow. The opponent stands to the right, so it comes back negative. */
export function lunge(distance: number): Motion {
  return {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: `translateX(${distance}px)`, offset: 0.35 },
      { transform: 'translateX(0)' },
    ],
    duration: 190,
    easing: 'ease-out',
  }
}

/**
 * What a skill looks like when it is running.
 *
 * Two parts, because they answer different questions. The **bob** is continuous and says
 * *busy* - an action takes seconds, and a figure that only moved on completion would
 * stand dead still for most of the job, which is what idle looks like. The **stroke**
 * fires once per completed action and says *that one is done*.
 *
 * Both are whole numbers of *sprite* pixels, and both are stepped rather than eased. A
 * fractional transform lands each 1x1 sprite pixel on a fractional boundary and smears
 * it - the same reason the art rules allow only integer scales.
 *
 * The mech has no articulated parts, so the whole figure is all there is to move. The
 * four are told apart by **axis, depth and rate**, not by what a pair of arms is doing:
 * stooping, leaning, tapping, hauling back. That is the honest ceiling on this sprite,
 * and it is why the differences are deliberately large - a subtle distinction at 96px is
 * no distinction.
 */
export interface WorkStyle {
  /** Class carrying the bob keyframes. Its period is set inline from the speed toggle. */
  bob: string
  /** A full bob cycle at 1x, in seconds. */
  bobSeconds: number
  stroke: Motion
}

const STEPPED = 'steps(1, end)'

/**
 * Exhaustive over the gathering skills on purpose: adding a fifth should be a compile
 * error asking what it looks like, not a skill that silently works in mime.
 */
export const WORK_STYLES: Record<GatheringSkillId, WorkStyle> = {
  // Stooping to the ground and coming back up with something.
  scavenging: {
    bob: 'work-stoop',
    bobSeconds: 1,
    stroke: {
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: `translateY(${SPRITE_PIXEL * 2}px)`, offset: 0.45 },
        { transform: 'translateY(0)' },
      ],
      duration: 220,
      easing: STEPPED,
    },
  },
  // Leaning in to feed a furnace: slow, and the only one that holds a position sideways.
  refining: {
    bob: 'work-feed',
    bobSeconds: 1.4,
    stroke: {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: `translateX(${SPRITE_PIXEL * 2}px)`, offset: 0.5 },
        { transform: 'translateX(0)' },
      ],
      duration: 320,
      easing: STEPPED,
    },
  },
  // Small fast taps, and a strike that rises before it falls - the one motion with an
  // anticipation in it, because assembly is the skill that is precise rather than heavy.
  fabrication: {
    bob: 'work-tap',
    bobSeconds: 0.5,
    stroke: {
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: `translateY(${-SPRITE_PIXEL}px)`, offset: 0.3 },
        { transform: `translateY(${SPRITE_PIXEL}px)`, offset: 0.55 },
        { transform: 'translateY(0)' },
      ],
      duration: 240,
      easing: STEPPED,
    },
  },
  // Wrenching something apart: the widest travel of the four, and the only one that
  // crosses its own resting position.
  salvaging: {
    bob: 'work-wrench',
    bobSeconds: 0.9,
    stroke: {
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-SPRITE_PIXEL * 3}px)`, offset: 0.6 },
        { transform: 'translateX(0)' },
      ],
      duration: 260,
      easing: STEPPED,
    },
  },
}

export function useMotion(
  /** The timer to watch: seconds toward the next swing, or progress toward completion. */
  progress: number,
  /** False when nothing is happening, so nothing twitches at an empty slab. */
  active: boolean,
  motion: Motion,
) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(progress)
  // Held in a ref so a caller can build the motion inline without the effect re-running
  // on every render and firing on a value that never actually fell.
  const current = useRef(motion)
  current.current = motion

  useEffect(() => {
    const fell = progress < previous.current
    previous.current = progress
    if (!fell || !active) return

    // Someone who has asked for less motion should not get a figure jumping at them
    // three times a second.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const { keyframes, duration, easing } = current.current
    ref.current?.animate(keyframes, { duration, easing })
  }, [progress, active])

  return ref
}
