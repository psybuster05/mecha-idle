/**
 * Pixel art, stored as data.
 *
 * Each sprite is rows of single characters indexed into a palette, with a space meaning
 * transparent. That format is deliberate: it is diffable, it costs nothing to load, it
 * carries no licence, and **replacing this art with a real artist's work means replacing
 * the data, not the renderer**. If a commissioned set arrives as PNGs later, the drawing
 * code stays and only the source of the pixels changes.
 *
 * This is programmer pixel art. It is a long way past coloured boxes and a long way
 * short of a Mega Man sprite sheet. It exists so the game has a face while that decision
 * is still open.
 *
 * Rules from CLAUDE.md that this honours: 16x16 authored, drawn at integer scale only,
 * never smoothed.
 */

export interface Sprite {
  /** One character per pixel. All rows must be the same length. */
  rows: readonly string[]
  /** Character to CSS colour. A space is always transparent. */
  palette: Readonly<Record<string, string>>
}

/**
 * The mech, unequipped. Sixteen by sixteen.
 *
 * Layers are drawn over this for whatever is fitted, so the silhouette changes as you
 * rebuild yourself - which is the one visual idea the fiction actually demands.
 */
export const MECH_BASE: Sprite = {
  palette: {
    '.': '#050c1a',
    B: '#2f6fd0',
    b: '#1d4a92',
    W: '#e8f1fb',
    C: '#6fe3ff',
  },
  rows: [
    '     ......     ',
    '    .BBBBBB.    ',
    '   .BBBBBBBB.   ',
    '   .BCCCCCCB.   ',
    '   .BCCCCCCB.   ',
    '   .bBBBBBBb.   ',
    '   ..WWWWWW..   ',
    '   .WWWWWWWW.   ',
    '   .WWbBBbWW.   ',
    '   .WWbBBbWW.   ',
    '   ..bBBBBb..   ',
    '    .BB..BB.    ',
    '    .BB..BB.    ',
    '    .bb..bb.    ',
    '   .bb....bb.   ',
    '   ....  ....   ',
  ],
}

/** Fitted arms widen the shoulders. Drawn over the base. */
export const MECH_ARMS: Sprite = {
  palette: { '.': '#050c1a', B: '#2f6fd0', b: '#1d4a92', W: '#e8f1fb' },
  rows: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    ' ...        ... ',
    ' .BB.      .BB. ',
    ' .BBB.    .BBB. ',
    ' .BBB.    .BBB. ',
    ' .bb.      .bb. ',
    ' ...        ... ',
    '                ',
    '                ',
    '                ',
    '                ',
  ],
}

/** Legs. Heavier tracks, or thrusters, depending what is fitted. */
export const MECH_LEGS_HEAVY: Sprite = {
  palette: { '.': '#050c1a', B: '#2f6fd0', b: '#1d4a92' },
  rows: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '   .BBB..BBB.   ',
    '   .BBB..BBB.   ',
    '   .bbb..bbb.   ',
    '  .bbbb..bbbb.  ',
    '  ......  ......',
  ],
}

export const MECH_LEGS_THRUSTER: Sprite = {
  palette: { '.': '#050c1a', B: '#2f6fd0', C: '#6fe3ff', b: '#1d4a92' },
  rows: [
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
    '    .BB..BB.    ',
    '    .bb..bb.    ',
    '    .CC..CC.    ',
    '     C    C     ',
    '                ',
  ],
}

/** The weapon arm, coloured by what it deals. */
function weaponSprite(colour: string, tip: string): Sprite {
  return {
    palette: { '.': '#050c1a', X: colour, T: tip },
    rows: [
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      '            ... ',
      '          ..XX. ',
      '        ..XXXX. ',
      '        .TTXX.  ',
      '        ..TT.   ',
      '         ...    ',
      '                ',
      '                ',
      '                ',
    ],
  }
}

export const WEAPON_SPRITES: Readonly<Record<string, Sprite>> = {
  kinetic: weaponSprite('#8fa5c4', '#e8f1fb'),
  energy: weaponSprite('#2f6fd0', '#6fe3ff'),
  emp: weaponSprite('#7a5fd0', '#c9a6ff'),
}

/**
 * Enemies, by archetype rather than one per enemy.
 *
 * Twenty enemies is more art than this project can carry right now, and archetypes read
 * fine at this size: you are meant to recognise "small and fast" versus "heavy and
 * armoured" at a glance, not to identify a specific unit. Orange throughout, because
 * that colour is reserved for things trying to kill you.
 */
const ENEMY_PALETTE = {
  '.': '#1a0c05',
  R: '#ff8a3d',
  r: '#c85f1e',
  Y: '#ffd08a',
  K: '#5a2f14',
} as const

export const ENEMY_SPRITES: Readonly<Record<string, Sprite>> = {
  /** Small, fast, fragile. Crawlers, scuttlers, work units. */
  skitter: {
    palette: ENEMY_PALETTE,
    rows: [
      '                ',
      '                ',
      '                ',
      '     ......     ',
      '    .rRRRRr.    ',
      '   .RRYYYYRR.   ',
      '   .RRYYYYRR.   ',
      '   .rRRRRRRr.   ',
      '  ..rrRRRRrr..  ',
      ' .r..rrrrrr..r. ',
      ' .r.  ....  .r. ',
      '.r.          .r.',
      '..            ..',
      '                ',
      '                ',
      '                ',
    ],
  },
  /** Airborne. Drones, lancers. */
  flyer: {
    palette: ENEMY_PALETTE,
    rows: [
      '                ',
      '                ',
      '   ..      ..   ',
      '  .rr.    .rr.  ',
      ' .rrrr....rrrr. ',
      ' ..rrr.RR.rrr.. ',
      '   ..RRRRRR..   ',
      '   .RRYYYYRR.   ',
      '   .RRYYYYRR.   ',
      '   .rRRRRRRr.   ',
      '    ..rrrr..    ',
      '      .KK.      ',
      '      .KK.      ',
      '       ..       ',
      '                ',
      '                ',
    ],
  },
  /** Heavy, plated, slow. Reclaimers, bastions, riot columns. */
  bulwark: {
    palette: ENEMY_PALETTE,
    rows: [
      '                ',
      '   ..........   ',
      '  .rRRRRRRRRr.  ',
      '  .RRRRRRRRRR.  ',
      '  .RRYYYYYYRR.  ',
      '  .RRYYYYYYRR.  ',
      '  .rRRRRRRRRr.  ',
      ' ..rRRRRRRRRr.. ',
      '.rr.RRRRRRRR.rr.',
      '.rr.RRRRRRRR.rr.',
      '.rr..rrrrrr..rr.',
      '.rr.  .KK.  .rr.',
      ' ..   .KK.   .. ',
      '     .KKKK.     ',
      '     ......     ',
      '                ',
    ],
  },
  /** Bosses. Bigger, crowned, unmistakable. */
  authority: {
    palette: ENEMY_PALETTE,
    rows: [
      '   .        .   ',
      '  .Y.  ..  .Y.  ',
      '  .YY..YY..YY.  ',
      '  .rYYYYYYYYr.  ',
      ' ..RRRRRRRRRR.. ',
      '.rrRRYYYYYYRRrr.',
      '.rrRRYYYYYYRRrr.',
      '.rrRRRRRRRRRRrr.',
      '.rr.RRRRRRRR.rr.',
      ' .. RRRRRRRR .. ',
      '    .rrrrrr.    ',
      '   .rr.KK.rr.   ',
      '   .r. .KK .r.  ',
      '      .KKKK.    ',
      '     .KK..KK.   ',
      '     ..    ..   ',
    ],
  },
}

/** Which sprite an enemy uses. Bosses always read as bosses. */
export function enemySpriteKey(enemy: {
  isBoss?: boolean
  maxHp: number
  evasion: number
}): string {
  if (enemy.isBoss) return 'authority'
  if (enemy.evasion >= 100) return 'flyer'
  if (enemy.maxHp >= 500) return 'bulwark'
  return 'skitter'
}
