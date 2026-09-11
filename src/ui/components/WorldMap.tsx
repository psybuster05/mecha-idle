import { useCallback, useEffect, useRef, useState } from 'react'
import { WORLD_EDGES, getNode, visibleNodes } from '../../content/world'
import { actorPosition, isNodeOpen } from '../../sim/world'
import type { WorldNodeDef } from '../../content/world'
import { MECH_BASE } from '../../content/sprites'
import type { GameState } from '../../sim/state'

/**
 * The world, drawn on a canvas.
 *
 * It used to run its own animation-frame loop against the live simulation so the walking
 * sprite would not stutter. Travel is gone, so nothing on this canvas moves between
 * player decisions and the throttled React snapshot is enough. It only ever reads.
 *
 * **Zoom and pan are what make it a map rather than a decoration.** The whole world is
 * drawn into a 740-unit logical space and then displayed in a ~280px column, so labels
 * land at about four physical pixels - present, and completely unreadable. Zooming in is
 * the only thing that makes the place names legible, which is the entire reason to have
 * names on it.
 */

/** Logical canvas size. Node coordinates are authored in this space. */
const MAP_WIDTH = 740
const MAP_HEIGHT = 540
/**
 * Labels sit under nodes and extend well past them, so the horizontal inset has to
 * clear half a place name - not just the node square - or the outermost labels clip.
 */
const PADDING_X = 80
const PADDING_Y = 34

/**
 * 1 fits the whole world; 3.5 is as far in as is useful.
 *
 * The ceiling is set by how sparse the graph is, not by legibility. Labels are readable
 * from about 2.7x - they are ~4 physical pixels at 1x in this column, which is the whole
 * reason zoom exists. But the visible window is 740/zoom logical units, and the nodes
 * average about 150 apart, so past ~4x you are usually looking at empty space between
 * two of them. An earlier ceiling of 8 rendered a blank square, which reads as broken.
 */
const MIN_ZOOM = 1
const MAX_ZOOM = 3.5

const COLOURS = {
  edge: '#1f3457',
  node: '#16243d',
  nodeStroke: '#2f4d7a',
  camp: '#1d4a92',
  combat: '#4a2a18',
  here: '#4aa8ff',
  label: '#708db4',
  locked: '#0c1526',
  lockedStroke: '#1c2c46',
  lockedLabel: '#41597c',
  labelHere: '#dce8f5',
}

/** Zoom multiplier and pan offset, both in logical map pixels. */
interface View {
  zoom: number
  x: number
  y: number
}

/**
 * Where the map sits before anyone touches it.
 *
 * Close enough to read the names around you, far enough to see what they connect to.
 * The whole world at once is the *least* useful framing - it is what you get by zooming
 * out, not what you should be handed.
 */
const DEFAULT_ZOOM = 2.5

/**
 * Keep the drawn world overlapping the canvas.
 *
 * At zoom z the content spans z * MAP_WIDTH, so the pan may run from the point where its
 * right edge meets the canvas right edge, to zero. At zoom 1 that collapses to exactly
 * zero, which is why the un-zoomed map cannot be dragged out of frame.
 */
function clampView(view: View): View {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom))
  return {
    zoom,
    x: Math.min(0, Math.max(MAP_WIDTH * (1 - zoom), view.x)),
    y: Math.min(0, Math.max(MAP_HEIGHT * (1 - zoom), view.y)),
  }
}

function bounds(nodes: readonly WorldNodeDef[]) {
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

/**
 * The view that keeps the mech in the middle at a given zoom.
 *
 * Used whenever the player has not taken manual control, so the map follows you as you
 * move rather than showing wherever you happened to start. Without this, starting an
 * action would leave the map looking at the place you just left.
 */
function followView(state: GameState, zoom: number): View {
  const shown = visibleNodes((id) => isNodeOpen(state, id))
  const project = makeProjection(shown)
  const pos = actorPosition(state, 'mech')
  const base = project(pos.x, pos.y)
  return clampView({
    zoom,
    x: MAP_WIDTH / 2 - base.x * zoom,
    y: MAP_HEIGHT / 2 - base.y * zoom,
  })
}

/** Map units -> canvas pixels, fitting the visible nodes with padding. Ignores zoom. */
function makeProjection(nodes: readonly WorldNodeDef[]) {
  const { minX, maxX, minY, maxY } = bounds(nodes)
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min((MAP_WIDTH - PADDING_X * 2) / spanX, (MAP_HEIGHT - PADDING_Y * 2) / spanY)
  // Centre whatever slack the tighter axis leaves over.
  const offsetX = (MAP_WIDTH - spanX * scale) / 2
  const offsetY = (MAP_HEIGHT - spanY * scale) / 2
  return (x: number, y: number) => ({
    x: offsetX + (x - minX) * scale,
    y: offsetY + (y - minY) * scale,
  })
}

/**
 * The mech, drawn from the same sprite data the Equipment panel uses.
 *
 * Drawn with the zoom transform *reset* and at an integer scale, unlike everything else
 * here. Under a fractional transform each 1x1 pixel would land on a fractional boundary
 * and smear, which is the one thing CLAUDE.md's art rules forbid. Vectors can take any
 * scale; pixel art cannot.
 */
function drawMech(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number) {
  const scale = Math.max(1, Math.min(4, Math.round(zoom)))
  const rows = MECH_BASE.rows
  const originX = Math.round(x - (rows[0]!.length * scale) / 2)
  const originY = Math.round(y - (rows.length * scale) / 2)

  for (let py = 0; py < rows.length; py++) {
    const row = rows[py]!
    for (let px = 0; px < row.length; px++) {
      const char = row[px]
      if (!char || char === ' ') continue
      const colour = MECH_BASE.palette[char]
      if (!colour) continue
      ctx.fillStyle = colour
      ctx.fillRect(originX + px * scale, originY + py * scale, scale, scale)
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, state: GameState, view: View, ratio: number) {
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

  const shown = visibleNodes((id) => isNodeOpen(state, id))
  const onScreen = new Set(shown.map((node) => node.id))
  const project = makeProjection(shown)
  const mech = state.actors.mech

  // Zoom and pan as a transform rather than as arithmetic on every coordinate, so line
  // widths and font sizes scale with it. Without that, zooming would spread the nodes
  // apart while leaving the labels the same unreadable size.
  ctx.setTransform(ratio * view.zoom, 0, 0, ratio * view.zoom, ratio * view.x, ratio * view.y)

  // --- edges ---
  ctx.lineWidth = 2
  for (const edge of WORLD_EDGES) {
    if (!onScreen.has(edge.a) || !onScreen.has(edge.b)) continue
    const a = getNode(edge.a)
    const b = getNode(edge.b)
    if (!a || !b) continue
    const pa = project(a.x, a.y)
    const pb = project(b.x, b.y)

    const sealed = !isNodeOpen(state, edge.a) || !isNodeOpen(state, edge.b)

    ctx.setLineDash(sealed ? [3, 4] : [])
    ctx.strokeStyle = sealed ? COLOURS.lockedStroke : COLOURS.edge
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // --- nodes ---
  ctx.font = '11px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  for (const node of shown) {
    const p = project(node.x, node.y)
    const here = mech.at === node.id
    const size = node.isCamp ? 22 : 16

    const open = isNodeOpen(state, node.id)

    ctx.fillStyle = !open
      ? COLOURS.locked
      : node.isCamp
        ? COLOURS.camp
        : node.combat
          ? COLOURS.combat
          : COLOURS.node
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)

    ctx.lineWidth = here ? 2 : 1
    ctx.setLineDash(open ? [] : [2, 3])
    ctx.strokeStyle = here ? COLOURS.here : open ? COLOURS.nodeStroke : COLOURS.lockedStroke
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size)
    ctx.setLineDash([])

    ctx.fillStyle = here ? COLOURS.labelHere : open ? COLOURS.label : COLOURS.lockedLabel
    ctx.fillText(node.name, p.x, p.y + size / 2 + 14)
  }

  // --- the mech ---
  const pos = actorPosition(state, 'mech')
  const base = project(pos.x, pos.y)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  drawMech(ctx, base.x * view.zoom + view.x, base.y * view.zoom + view.y, view.zoom)
}

export function WorldMap({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // null means "follow the mech". Any deliberate zoom, pan or button press pins the
  // view where the player put it, because a map that yanks itself back while you are
  // reading it is worse than one that does not follow at all.
  const [manual, setManual] = useState<View | null>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const view = manual ?? followView(state, DEFAULT_ZOOM)
  const following = manual === null

  // The wheel listener is bound once, so it cannot close over `state` - it would go
  // stale the moment the mech moved. This is how it reads the current one.
  const stateRef = useRef(state)
  stateRef.current = state

  /** Client pixels -> logical map pixels. The canvas is displayed far smaller than it
   *  is drawn, so a raw offsetX would be wrong by that ratio. */
  const toLogical = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (MAP_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (MAP_HEIGHT / rect.height),
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Render at device resolution so the map is crisp on high-DPI screens, while all
    // drawing code keeps working in the fixed logical map space.
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = MAP_WIDTH * ratio
    canvas.height = MAP_HEIGHT * ratio
    ctx.imageSmoothingEnabled = false

    draw(ctx, state, view, ratio)
  }, [state, view.zoom, view.x, view.y])

  // Native listener rather than onWheel, because React attaches wheel handlers passively
  // and preventDefault is what stops the page scrolling as you zoom.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const cursor = toLogical(event)
      setManual((pinned) => {
        const current = pinned ?? followView(stateRef.current, DEFAULT_ZOOM)
        const zoom = current.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
        // Hold whatever is under the cursor still while the scale changes around it.
        const factor = next / current.zoom
        return clampView({
          zoom: next,
          x: cursor.x - (cursor.x - current.x) * factor,
          y: cursor.y - (cursor.y - current.y) * factor,
        })
      })
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [toLogical])

  /** Step the zoom about the middle of the canvas, for the +/- buttons. */
  const step = (factor: number) =>
    setManual((pinned) => {
      const current = pinned ?? followView(stateRef.current, DEFAULT_ZOOM)
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor))
      const ratio = next / current.zoom
      const cx = MAP_WIDTH / 2
      const cy = MAP_HEIGHT / 2
      return clampView({
        zoom: next,
        x: cx - (cx - current.x) * ratio,
        y: cy - (cy - current.y) * ratio,
      })
    })

  return (
    <div className="world-map">
      <canvas
        ref={canvasRef}
        className="world-canvas"
        style={{
          aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
          cursor: view.zoom > MIN_ZOOM ? 'grab' : 'default',
        }}
        aria-label="World map. Scroll to zoom, drag to pan."
        onPointerDown={(event) => {
          if (view.zoom <= MIN_ZOOM) return
          drag.current = toLogical(event)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          const now = toLogical(event)
          const from = drag.current
          drag.current = now
          setManual((pinned) => {
            const current = pinned ?? view
            return clampView({
              ...current,
              x: current.x + (now.x - from.x),
              y: current.y + (now.y - from.y),
            })
          })
        }}
        onPointerUp={(event) => {
          drag.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onDoubleClick={() => setManual(null)}
      />

      <div className="map-controls">
        <button onClick={() => step(1 / 1.4)} disabled={view.zoom <= MIN_ZOOM} title="Zoom out">
          &minus;
        </button>
        <button onClick={() => step(1.4)} disabled={view.zoom >= MAX_ZOOM} title="Zoom in">
          +
        </button>
        {!following && (
          <button onClick={() => setManual(null)} title="Follow the mech again">
            &#9678;
          </button>
        )}
      </div>
    </div>
  )
}
