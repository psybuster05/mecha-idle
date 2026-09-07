import { useEffect, useRef } from 'react'
import type { Sprite } from '../../content/sprites'

/**
 * Draws stacked sprites to a canvas at integer scale.
 *
 * Integer scale and `imageSmoothingEnabled = false` are not stylistic - a fractional
 * scale turns pixel art to mush, which is why CLAUDE.md fixes the authored size and the
 * scaling rule together.
 *
 * Layers are drawn in order, so the mech is a base with whatever is fitted painted over
 * it. That is the whole reason the sprites are 16x16 with transparent gaps.
 */
export function PixelSprite({
  layers,
  scale = 4,
  className,
  title,
}: {
  layers: readonly (Sprite | undefined)[]
  scale?: number
  className?: string
  title?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const present = layers.filter((layer): layer is Sprite => layer !== undefined)
  const width = present[0]?.rows[0]?.length ?? 16
  const height = present[0]?.rows.length ?? 16

  // Redraw whenever the stack changes. The palette is part of the identity, so a
  // recoloured layer counts as a change.
  const key = present.map((s) => s.rows.join('') + Object.values(s.palette).join('')).join('|')

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const sprite of present) {
      for (let y = 0; y < sprite.rows.length; y++) {
        const row = sprite.rows[y] ?? ''
        for (let x = 0; x < row.length; x++) {
          const char = row[x]
          if (!char || char === ' ') continue
          const colour = sprite.palette[char]
          if (!colour) continue
          ctx.fillStyle = colour
          ctx.fillRect(x * scale, y * scale, scale, scale)
        }
      }
    }
  }, [key, scale, present])

  return (
    <canvas
      ref={ref}
      className={className}
      width={width * scale}
      height={height * scale}
      style={{ imageRendering: 'pixelated' }}
      aria-label={title}
      role={title ? 'img' : 'presentation'}
    />
  )
}
