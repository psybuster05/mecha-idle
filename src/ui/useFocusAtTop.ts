import { useEffect, useRef } from 'react'

/**
 * Focus a dialog's button without scrolling to it.
 *
 * `autoFocus` scrolls the focused element into view, and on a dialog with more text than
 * fits, the button is at the bottom - so the dialog opened already scrolled past its own
 * title. The game's ending opened 124px down, past its title and first line, and a
 * player who skims presses Continue having never seen how it begins.
 *
 * The button still gets focus, so Enter and Space still dismiss it and a keyboard user
 * loses nothing. It just no longer drags the page there. The container is reset to the
 * top as well, because some browsers scroll anyway and "start at the beginning" is the
 * whole point.
 */
export function useFocusAtTop<T extends HTMLElement>() {
  const container = useRef<HTMLDivElement>(null)
  const button = useRef<T>(null)

  useEffect(() => {
    button.current?.focus({ preventScroll: true })
    if (container.current) container.current.scrollTop = 0
  }, [])

  return { container, button }
}
