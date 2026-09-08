import { useEffect, useRef } from 'react'

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
 * Bringing something down on the work - one stroke per completed action.
 *
 * Stepped rather than eased, and a whole number of *sprite* pixels rather than a whole
 * number of screen ones. A fractional transform lands each 1x1 sprite pixel on a
 * fractional boundary and smears it, which is the same reason the art rules allow only
 * integer scales; holding two positions keeps every frame crisp and reads as a machine
 * rather than a pendulum.
 */
export function workStroke(spritePixel: number): Motion {
  return {
    keyframes: [
      { transform: 'translateY(0)' },
      { transform: `translateY(${spritePixel * 2}px)`, offset: 0.45 },
      { transform: 'translateY(0)' },
    ],
    duration: 220,
    easing: 'steps(1, end)',
  }
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
