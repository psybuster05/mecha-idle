import { useEffect, useRef, type RefObject } from 'react'
import { ADJACENCY, WORLD_EDGES, WORLD_NODES, getNode } from '../../content/world'
import { actorPosition, isNodeOpen } from '../../sim/world'
import type { WorldNodeDef } from '../../content/world'
import { MECH_BASE } from '../../content/sprites'
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
/**
 * Labels sit under nodes and extend well past them, so the horizontal inset has to
 * clear half a place name - not just the node square - or the outermost labels clip.
 */
const PADDING_X = 80
const PADDING_Y = 34

const COLOURS = {
  edge: '#1f3457',
  edgeActive: '#4aa8ff',
  node: '#16243d',
  nodeStroke: '#2f4d7a',
  camp: '#1d4a92',
  combat: '#4a2a18',
  here: '#4aa8ff',
  destination: '#4aa8ff',
  label: '#708db4',
  locked: '#0c1526',
  lockedStroke: '#1c2c46',
  lockedLabel: '#41597c',
  labelHere: '#dce8f5',
}

/**
 * What the map shows: everywhere you can reach, plus its immediate frontier.
 *
 * The world is twenty-four places by the end and drawing all of them at once turned it
 * into unreadable overlapping labels. Showing the frontier - the locked places one step
 * beyond where you can go - keeps it legible while preserving the "there is more out
 * there" hook, and the map visibly grows as regions open.
 */
function visibleNodes(state: GameState): WorldNodeDef[] {
  const open = WORLD_NODES.filter((node) => isNodeOpen(state, node.id))
  const frontier = new Set<string>()
  for (const node of open) {
    for (const edge of ADJACENCY.get(node.id) ?? []) frontier.add(edge.to)
  }
  return WORLD_NODES.filter((node) => isNodeOpen(state, node.id) || frontier.has(node.id))
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

/** Map units -> canvas pixels, fitting the visible nodes with padding. */
function makeProjection(nodes: readonly WorldNodeDef[]) {
  const { minX, maxX, minY, maxY } = bounds(nodes)
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)
  const scale = Math.min(
    (MAP_WIDTH - PADDING_X * 2) / spanX,
    (MAP_HEIGHT - PADDING_Y * 2) / spanY,
  )
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
 * One source of art for both, so a change to the pixels shows up everywhere. Drawn at
 * 1:1 here because a 16x16 sprite is already the right size against these nodes, and
 * anything fractional would smear it.
 */
function drawMech(ctx: CanvasRenderingContext2D, x: number, y: number, walking: boolean, t: number) {
  // A two-frame bob while walking, so movement reads as movement and not as sliding.
  const bob = walking ? Math.round(Math.sin(t / 150)) : 0
  const rows = MECH_BASE.rows
  const originX = Math.round(x - rows[0]!.length / 2)
  const originY = Math.round(y - rows.length / 2) + bob

  for (let py = 0; py < rows.length; py++) {
    const row = rows[py]!
    for (let px = 0; px < row.length; px++) {
      const char = row[px]
      if (!char || char === ' ') continue
      const colour = MECH_BASE.palette[char]
      if (!colour) continue
      ctx.fillStyle = colour
      ctx.fillRect(originX + px, originY + py, 1, 1)
    }
  }
}

function draw(ctx: CanvasRenderingContext2D, state: GameState, timeMs: number) {
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

  const shown = visibleNodes(state)
  const onScreen = new Set(shown.map((node) => node.id))
  const project = makeProjection(shown)

  const mech = state.actors.mech
  const travellingTo: NodeId | null = mech.travel
    ? (mech.travel.remaining.at(-1) ?? mech.travel.to)
    : null
  const activeHop = mech.travel ? `${mech.travel.from}:${mech.travel.to}` : null

  // --- edges ---
  ctx.lineWidth = 2
  for (const edge of WORLD_EDGES) {
    if (!onScreen.has(edge.a) || !onScreen.has(edge.b)) continue
    const a = getNode(edge.a)
    const b = getNode(edge.b)
    if (!a || !b) continue
    const pa = project(a.x, a.y)
    const pb = project(b.x, b.y)

    const isActive = activeHop === `${edge.a}:${edge.b}` || activeHop === `${edge.b}:${edge.a}`
    const sealed = !isNodeOpen(state, edge.a) || !isNodeOpen(state, edge.b)

    ctx.setLineDash(sealed ? [3, 4] : [])
    ctx.strokeStyle = isActive ? COLOURS.edgeActive : sealed ? COLOURS.lockedStroke : COLOURS.edge
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
    const here = mech.at === node.id && !mech.travel
    const isDestination = travellingTo === node.id
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

    ctx.lineWidth = here || isDestination ? 2 : 1
    ctx.setLineDash(open ? [] : [2, 3])
    ctx.strokeStyle = here
      ? COLOURS.here
      : isDestination
        ? COLOURS.destination
        : open
          ? COLOURS.nodeStroke
          : COLOURS.lockedStroke
    ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size)
    ctx.setLineDash([])

    if (isDestination) {
      // A pulsing ring on where we are headed.
      const pulse = 4 + Math.sin(timeMs / 200) * 2
      ctx.strokeStyle = COLOURS.destination
      ctx.globalAlpha = 0.5
      ctx.strokeRect(p.x - size / 2 - pulse, p.y - size / 2 - pulse, size + pulse * 2, size + pulse * 2)
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = here ? COLOURS.labelHere : open ? COLOURS.label : COLOURS.lockedLabel
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
