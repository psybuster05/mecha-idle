import { useEffect, useRef, type RefObject } from 'react'
import { WORLD_EDGES, WORLD_NODES, getNode } from '../../content/world'
import { actorPosition } from '../../sim/world'
import type { GameState, NodeId } from '../../sim/state'

/**
 * The world, drawn on a canvas.
 *
 * This runs its own animation-frame loop reading the *live* simulation rather than
 * React's throttled snapshot, so the sprite moves smoothly instead of stepping ten
 * times a second. It only ever reads - every decision still belongs to the sim.
 *
 * Placeholder art: blocks and lines. Sprite work lands later, and the integer-scaling
 * rule in CLAUDE.md is why the canvas is drawn at a fixed logical size and scaled up.
 */

/** Logical canvas size. Node coordinates are authored in this space. */
const MAP_WIDTH = 740
const MAP_HEIGHT = 540
const PADDING = 40

const COLOURS = {
  edge: '#263038',
  edgeActive: '#7a5a26',
  node: '#2a343c',
  nodeStroke: '#3d4a55',
  camp: '#3a4a3a',
  combat: '#4a2f2a',
  here: '#ffb648',
  destination: '#ffb648',
  label: '#8b9aa6',
  labelHere: '#c9d6de',
  mech: '#ffb648',
  mechDark: '#8a5f1f',
}

function bounds() {
  const xs = WORLD_NODES.map((n) => n.x)
  const ys = WORLD_NODES.map((n) => n.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

/** Map units -> canvas pixels, fitting all nodes with padding. */
function makeProjection() {
  const { minX, maxX, minY, maxY } = bounds()
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min(
    (MAP_WIDTH - PADDING * 2) / spanX,
    (MAP_HEIGHT - PADDING * 2) / spanY,
  )
  return (x: number, y: number) => ({
    x: PADDING + (x - minX) * scale,
    y: PADDING + (y - minY) * scale,
  })
}

const project = makeProjection()

function drawMech(ctx: CanvasRenderingContext2D, x: number, y: number, walking: boolean, t: number) {
  // A two-frame bob while walking, so movement reads as movement and not as sliding.
  const bob = walking ? Math.round(Math.sin(t / 120) * 2) : 0
  const size = 14

  ctx.fillStyle = COLOURS.mechDark
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2) + bob + 2, size, size)
  ctx.fillStyle = COLOURS.mech
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2) + bob, size, size - 3)

  // A visor, so it reads as facing you rather than as a box.
  ctx.fillStyle = '#1a1206'
  ctx.fillRect(Math.round(x - 4), Math.round(y - 3) + bob, 8, 3)
}

function draw(ctx: CanvasRenderingContext2D, state: GameState, timeMs: number) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

  const mech = state.actors.mech
  const travellingTo: NodeId | null = mech.travel
    ? (mech.travel.remaining.at(-1) ?? mech.travel.to)
    : null
  const activeHop = mech.travel ? `${mech.travel.from}:${mech.travel.to}` : null

  // --- edges ---
  ctx.lineWidth = 2
  for (const edge of WORLD_EDGES) {
    const a = getNode(edge.a)
    const b = getNode(edge.b)
    if (!a || !b) continue
    const pa = project(a.x, a.y)
    const pb = project(b.x, b.y)

    const isActive = activeHop === `${edge.a}:${edge.b}` || activeHop === `${edge.b}:${edge.a}`
    ctx.strokeStyle = isActive ? COLOURS.edgeActive : COLOURS.edge
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  // --- nodes ---
  ctx.font = '11px ui-monospace, Consolas, monospace'
  ctx.textAlign = 'center'
  for (const node of WORLD_NODES) {
    const p = project(node.x, node.y)
    const here = mech.at === node.id && !mech.travel
    const isDestination = travellingTo === node.id
    const size = node.isCamp ? 22 : 16

    ctx.fillStyle = node.isCamp ? COLOURS.camp : node.combat ? COLOURS.combat : COLOURS.node
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)

    ctx.lineWidth = here || isDestination ? 2 : 1
    ctx.strokeStyle = here ? COLOURS.here : isDestination ? COLOURS.destination : COLOURS.nodeStroke
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size)

    if (isDestination) {
      // A pulsing ring on where we are headed.
      const pulse = 4 + Math.sin(timeMs / 200) * 2
      ctx.strokeStyle = COLOURS.destination
      ctx.globalAlpha = 0.5
      ctx.strokeRect(p.x - size / 2 - pulse, p.y - size / 2 - pulse, size + pulse * 2, size + pulse * 2)
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = here ? COLOURS.labelHere : COLOURS.label
    ctx.fillText(node.name, p.x, p.y + size / 2 + 14)
  }

  // --- the mech ---
  const pos = actorPosition(state, 'mech')
  const screen = project(pos.x, pos.y)
  drawMech(ctx, screen.x, screen.y, mech.travel !== null, timeMs)
}

export function WorldMap({ live }: { live: RefObject<GameState> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    ctx.scale(ratio, ratio)
    ctx.imageSmoothingEnabled = false

    let frame = 0
    const loop = (timeMs: number) => {
      const state = live.current
      if (state) draw(ctx, state, timeMs)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [live])

  return (
    <canvas
      ref={canvasRef}
      className="world-canvas"
      style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}
      aria-label="World map"
    />
  )
}
