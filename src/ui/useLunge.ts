import { useEffect, useRef } from 'react'

/**
 * Nudges a figure toward its opponent each time it swings.
 *
 * **A swing is a *fall* in the attack timer.** It counts up to the interval and resets,
 * so watching for the reset is what tells the view a blow just landed - the simulation
 * announces nothing, exactly as with item gains, and stays unaware that anything is
 * drawn at all.
 *
 * Driven through the Web Animations API rather than a CSS class, for one practical
 * reason: replaying a CSS animation means removing the class, forcing a reflow and
 * putting it back, or remounting the element - and remounting would tear down and redraw
 * the sprite canvas on every swing. `animate()` just restarts.
 *
 * The figures carry no transform of their own while squared off, so borrowing transform
 * here cannot fight the centring one the idle mech uses.
 */
export function useLunge(
  /** The actor's attack timer, in seconds until its next swing. */
  progress: number,
  /** False between targets, so nothing lunges at an empty slab. */
  active: boolean,
  /** How far, and which way. Positive is rightward. */
  distance: number,
) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(progress)

  useEffect(() => {
    const swung = progress < previous.current
    previous.current = progress
    if (!swung || !active) return

    // Someone who has asked for less motion should not get a figure jumping at them
    // three times a second.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    ref.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${distance}px)`, offset: 0.35 },
        { transform: 'translateX(0)' },
      ],
      { duration: 190, easing: 'ease-out' },
    )
  }, [progress, active, distance])

  return ref
}
