/**
 * The bridge between the pure simulation and React.
 *
 * The sim ticks in a requestAnimationFrame loop and lives in a ref. React re-renders
 * from a snapshot on a throttled interval - never once per frame - so the UI cost is
 * flat no matter how much is happening in the sim.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { applyOffline, MAX_OFFLINE_SECONDS, type OfflineReport } from '../sim/offline'
import { deserialize, serialize } from '../sim/save'
import { DEMO_PACE } from '../sim/pace'
import { newGame, type GameState } from '../sim/state'
import { tick } from '../sim/tick'
import type { SaveAdapter } from '../platform/SaveAdapter'

/** How often React is handed a new snapshot. 10/sec reads as live without the cost. */
const RENDER_INTERVAL_MS = 100
const AUTOSAVE_INTERVAL_MS = 10_000

export interface Game {
  /** Throttled snapshot for React panels. Changes ~10 times a second. */
  state: GameState
  ready: boolean
  offlineReport: OfflineReport | null
  dismissOffline: () => void
  /** Apply a pure state transform from `sim/intents`. */
  dispatch: (transform: (state: GameState) => GameState) => void
  loadError: string | null
  saveNow: () => void
}

interface BootResult {
  state: GameState
  report: OfflineReport | null
  error: string | null
}

/**
 * @param initial What an *empty* slot starts as. Defaults to a new game; the preset
 *   slots hand in a stage instead. Read once, on the first render, like any lazy ref -
 *   so it seeds a slot and never overwrites one that already has a save in it.
 */
export function useGame(adapter: SaveAdapter, initial?: () => GameState): Game {
  const stateRef = useRef<GameState>(initial ? initial() : newGame(Date.now() >>> 0))
  const [snapshot, setSnapshot] = useState<GameState>(stateRef.current)
  const [ready, setReady] = useState(false)
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const bootRef = useRef<Promise<BootResult> | null>(null)
  const savableRef = useRef(false)

  const saveNow = useCallback(() => {
    if (!savableRef.current) return
    void adapter.save(serialize(stateRef.current, Date.now())).catch((error: unknown) => {
      setLoadError(error instanceof Error ? error.message : String(error))
    })
  }, [adapter])

  // --- Boot: load, then credit time spent away --------------------------
  useEffect(() => {
    // StrictMode invokes effects twice in development. The boot promise is created
    // once and both runs await the same result, so offline progress is credited
    // exactly once while the second run still gets to flip `ready`. Guarding with a
    // plain boolean instead would leave the second run with nothing to do and the
    // game stuck on the loading screen.
    bootRef.current ??= (async (): Promise<BootResult> => {
      const raw = await adapter.load()
      if (!raw) return { state: stateRef.current, report: null, error: null }

      const result = deserialize(raw)
      if (!result.ok) {
        // Keep the unreadable save on disk rather than overwriting it - it may be
        // recoverable by hand, and silently starting a new game over someone's
        // progress is unforgivable.
        return { state: stateRef.current, report: null, error: result.error }
      }

      const { state, report } = applyOffline(result.state, Date.now(), DEMO_PACE)
      return { state, report, error: null }
    })()

    let active = true
    void bootRef.current.then((booted) => {
      if (!active) return
      stateRef.current = booted.state
      setOfflineReport(booted.report)
      // Never autosave over a save we could not read.
      savableRef.current = booted.error === null
      if (booted.error) setLoadError(booted.error)
      setSnapshot(booted.state)
      setReady(true)
    })

    return () => {
      active = false
    }
  }, [adapter])

  // --- The simulation clock ---------------------------------------------
  useEffect(() => {
    if (!ready) return

    let frame = 0
    let lastFrameMs = performance.now()
    let lastRenderMs = 0

    const step = (nowMs: number) => {
      // rAF stops firing in a background tab, so this delta can be very large on
      // return. tick handles that correctly by design; the cap keeps a machine that
      // slept for days on the same footing as the offline rule.
      // Capped in real seconds, then dilated - the same order as the offline rule, so
      // a backgrounded tab and a closed one credit the same thing.
      const dt = Math.min((nowMs - lastFrameMs) / 1000, MAX_OFFLINE_SECONDS) * DEMO_PACE
      lastFrameMs = nowMs

      if (dt > 0) stateRef.current = tick(stateRef.current, dt)

      if (nowMs - lastRenderMs >= RENDER_INTERVAL_MS) {
        lastRenderMs = nowMs
        setSnapshot(stateRef.current)
      }
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [ready])

  // --- Persistence -------------------------------------------------------
  useEffect(() => {
    if (!ready) return
    const timer = setInterval(saveNow, AUTOSAVE_INTERVAL_MS)

    // Tab-hide is the reliable "user is leaving" signal on mobile; beforeunload is
    // not. Save on both.
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', saveNow)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', saveNow)
      saveNow()
    }
  }, [ready, saveNow])

  const dispatch = useCallback((transform: (state: GameState) => GameState) => {
    stateRef.current = transform(stateRef.current)
    setSnapshot(stateRef.current)
  }, [])

  const dismissOffline = useCallback(() => setOfflineReport(null), [])

  return { state: snapshot, ready, offlineReport, dismissOffline, dispatch, loadError, saveNow }
}
