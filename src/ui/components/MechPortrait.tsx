import { getItem } from '../../content'
import {
  MECH_ARMS,
  MECH_BASE,
  MECH_LEGS_HEAVY,
  MECH_LEGS_THRUSTER,
  WEAPON_SPRITES,
  type Sprite,
} from '../../content/sprites'
import type { GameState } from '../../sim/state'
import { PixelSprite } from './PixelSprite'

/**
 * You, as currently assembled.
 *
 * The one visual idea the fiction actually demands: every part you fit is literally your
 * own body, so the silhouette has to change when you fit one. Layers are chosen from
 * what is equipped, and an empty slot simply contributes nothing - which is why a fresh
 * mech reads as stripped.
 */
export function MechPortrait({ state, scale = 5 }: { state: GameState; scale?: number }) {
  const layers: (Sprite | undefined)[] = [MECH_BASE]

  if (state.equipment.arms) layers.push(MECH_ARMS)

  const legs = state.equipment.legs
  if (legs) {
    // Thrusters read differently from tracks, which is the point of fitting them.
    const nimble = (getItem(legs)?.stats?.evasion ?? 0) >= 18
    layers.push(nimble ? MECH_LEGS_THRUSTER : MECH_LEGS_HEAVY)
  }

  const weapon = state.equipment.weapon
  if (weapon) {
    const type = getItem(weapon)?.stats?.damageType ?? 'kinetic'
    layers.push(WEAPON_SPRITES[type])
  }

  const fitted = [state.equipment.frame, state.equipment.arms, state.equipment.legs,
    state.equipment.weapon, state.equipment.reactor].filter(Boolean).length

  return (
    <div className="portrait">
      <PixelSprite layers={layers} scale={scale} title="Your mech" />
      <div className="portrait-caption dim">
        {fitted === 0 ? 'Stripped' : `${fitted} of 5 fitted`}
      </div>
    </div>
  )
}
