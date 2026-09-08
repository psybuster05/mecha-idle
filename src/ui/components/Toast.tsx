import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Transient notices, for things that would otherwise fail silently.
 *
 * Purely a view concern - the simulation never knows these exist. Nothing here changes
 * state, it only explains state the player just tried to change.
 */
export interface Toast {
  id: number
  message: string
}

const VISIBLE_MS = 4000

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  // Cleared on unmount so a pending timer cannot set state on a dead component.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const show = useCallback((message: string) => {
    setToasts((current) => {
      // Clicking a dead button three times should say it once, not stack three copies.
      if (current.some((toast) => toast.message === message)) return current
      const id = nextId.current++
      timers.current.push(
        setTimeout(() => setToasts((rest) => rest.filter((toast) => toast.id !== id)), VISIBLE_MS),
      )
      return [...current, { id, message }]
    })
  }, [])

  return { toasts, show }
}

export function Toasts({ toasts }: { toasts: readonly Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      ))}
    </div>
  )
}
