import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Transient notices, for things that would otherwise happen silently.
 *
 * Purely a view concern - the simulation never knows these exist. Nothing here changes
 * state, it only reports state that just changed.
 *
 * Two kinds, and the difference matters for volume. A **notice** is one-off and rare (no
 * fuel for that). A **gain** is a stream: an item lands every few seconds, and at 3x with
 * two actors it is faster than that. Gains with the same key merge into one line that
 * counts up, so a long scavenging run shows a single growing "+14 Scrap Steel" rather
 * than fourteen identical toasts fighting for the same corner.
 */

export type ToastTone = 'notice' | 'gain'

export interface Toast {
  id: number
  /** Toasts sharing a key merge. Undefined means never merge. */
  key?: string
  label: string
  /** Set for gains; the running total since this toast appeared. */
  amount?: number
  tone: ToastTone
}

const VISIBLE_MS = 3500
/** Beyond this the corner is a wall of text and none of it gets read. */
const MAX_VISIBLE = 5

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  /** (Re)start the countdown for one toast. Merging restarts it, so a live stream keeps
   *  its line on screen until it actually stops. */
  const arm = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id)
        setToasts((rest) => rest.filter((toast) => toast.id !== id))
      }, VISIBLE_MS),
    )
  }, [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      setToasts((current) => {
        const existing = toast.key ? current.find((t) => t.key === toast.key) : undefined
        if (existing) {
          arm(existing.id)
          return current.map((t) =>
            t.id === existing.id
              ? { ...t, amount: (t.amount ?? 0) + (toast.amount ?? 0), label: toast.label }
              : t,
          )
        }

        // Same text twice in a row says it once - clicking a dead button three times
        // should not stack three copies.
        if (!toast.key && current.some((t) => t.label === toast.label)) return current

        const id = nextId.current++
        arm(id)
        const next = [...current, { ...toast, id }]
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next
      })
    },
    [arm],
  )

  const show = useCallback((label: string) => push({ label, tone: 'notice' }), [push])

  const showGain = useCallback(
    (key: string, label: string, amount: number) =>
      push({ key, label, amount, tone: 'gain' }),
    [push],
  )

  return { toasts, show, showGain }
}

export function Toasts({ toasts }: { toasts: readonly Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.amount !== undefined && <span className="toast-amount">+{toast.amount}</span>}
          {toast.label}
        </div>
      ))}
    </div>
  )
}
