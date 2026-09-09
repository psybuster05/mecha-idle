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


// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * One shared palette for every icon, so they read as a set.
 *
 * The colour language is the same one the rest of the art uses: blue is yours, cyan is
 * a live readout, orange is heat or hostility, green is health. An icon inventing its
 * own colours would break the thing that lets a player read the screen without reading
 * the words.
 */
const ICON_PALETTE: Readonly<Record<string, string>> = {
  '.': '#050c1a',
  B: '#2f6fd0',
  b: '#1d4a92',
  W: '#e8f1fb',
  C: '#6fe3ff',
  O: '#ff8a3d',
  G: '#4fe0b0',
  // Damage-type colours, taken from WEAPON_SPRITES rather than picked fresh, so the
  // weapon drawn on your portrait and the type tag beside it are the same colour.
  S: '#8fa5c4',
  V: '#7a5fd0',
}

const icon = (rows: readonly string[]): Sprite => ({ rows, palette: ICON_PALETTE })

/**
 * Skill icons, one per skill.
 *
 * Not one per action, for the same reason enemies get archetype sprites: eighty-odd
 * actions is more art than this project can carry, and at 16x16 the silhouette is what
 * reads anyway.
 */
export const SKILL_ICONS: Readonly<Record<string, Sprite>> = {
  // A three-prong grab. Two prongs merged into a pair of dividers at 16px; three with
  // real gaps between them reads as something that takes hold of scrap.
  scavenging: icon([
    '                ',
    '       ..       ',
    '      .WW.      ',
    '      .BB.      ',
    '   ...bBBb...   ',
    '  .BBBBBBBBBB.  ',
    '  .bBBBBBBBBb.  ',
    '  ...  ...  ... ',
    '  .B.  .B.  .B. ',
    '  .B.  .B.  .B. ',
    '  .b.  .b.  .b. ',
    '  .b.  .b.  .b. ',
    '  ...  ...  ... ',
    '                ',
    '                ',
    '                ',
  ]),
  // A furnace with the fire showing. Heat is the only argument scrap responds to.
  refining: icon([
    '                ',
    '  ............  ',
    '  .bbbbbbbbbb.  ',
    '  .b........b.  ',
    '  .b..OOOO..b.  ',
    '  .b.OOWWOO.b.  ',
    '  .b.OWWWWO.b.  ',
    '  .b.OOWWOO.b.  ',
    '  .b..OOOO..b.  ',
    '  .b........b.  ',
    '  .bbbbbbbbbb.  ',
    '  ............  ',
    '   .b.    .b.   ',
    '   ...    ...   ',
    '                ',
    '                ',
  ]),
  // An anvil. The press read as three stacked bars; this silhouette is its own.
  fabrication: icon([
    '                ',
    '                ',
    '   ..........   ',
    '  .WWWWWWWWWWW. ',
    '  .BBBBBBBBBBB. ',
    '  ..BBBBBBBBB.  ',
    '   ..BBBBBBB.   ',
    '     .BBBB.     ',
    '     .BBBB.     ',
    '    ..BBBB..    ',
    '   .BBBBBBBB.   ',
    '   .bbbbbbbb.   ',
    '   ..........   ',
    '                ',
    '                ',
    '                ',
  ]),
  // A cutting torch, sparks coming off what it is taking apart.
  salvaging: icon([
    '                ',
    '  ....          ',
    '  .bB..         ',
    '  .BBBb..       ',
    '   .BBBBb..     ',
    '    .BBBBBb.    ',
    '     .BBBBB.    ',
    '      .OOO.  O  ',
    '       .O. O    ',
    '        .   O   ',
    '   ..      O    ',
    '  .WW.   O   O  ',
    '  .WW.          ',
    '  .bb.     O    ',
    '  ....          ',
    '                ',
  ]),
  // A reticle. Attack is what lands the shot.
  attack: icon([
    '                ',
    '       ..       ',
    '       CC       ',
    '       CC       ',
    '    ........    ',
    '   ..bBBBBb..   ',
    '  ..B......B..  ',
    ' CC.B..CC..B.CC ',
    ' CC.B..CC..B.CC ',
    '  ..B......B..  ',
    '   ..bBBBBb..   ',
    '    ........    ',
    '       CC       ',
    '       CC       ',
    '       ..       ',
    '                ',
  ]),
  // An impact, throwing sparks.
  strength: icon([
    '                ',
    '    O           ',
    '     O    O     ',
    '  O   .....  O  ',
    '     .OOOOO.    ',
    '    .OWWWWWO.   ',
    '   .OWWWWWWWO.  ',
    '   .OWWWWWWWO.  ',
    '   .OWWWWWWWO.  ',
    '    .OWWWWWO.   ',
    '     .OOOOO.    ',
    '  O   .....  O  ',
    '     O    O     ',
    '           O    ',
    '                ',
    '                ',
  ]),
  // A shield.
  defence: icon([
    '                ',
    '   ..........   ',
    '  .bBBBBBBBBb.  ',
    '  .BWWWWWWWWB.  ',
    '  .BWbbbbbbWB.  ',
    '  .BWbBBBBbWB.  ',
    '  .BWbBBBBbWB.  ',
    '  .BWbbbbbbWB.  ',
    '  .BWWWWWWWWB.  ',
    '   .BWWWWWWB.   ',
    '    .BWWWWB.    ',
    '     .BWWB.     ',
    '      .BB.      ',
    '       ..       ',
    '                ',
    '                ',
  ]),
  // A cross. Standard for health, and readable at any size.
  hitpoints: icon([
    '                ',
    '      ....      ',
    '      .GG.      ',
    '      .GG.      ',
    '   ....GG....   ',
    '   .GGGGGGGG.   ',
    '   .GGGGGGGG.   ',
    '   ....GG....   ',
    '      .GG.      ',
    '      .GG.      ',
    '      ....      ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ]),
  // A bolt in flight. The trail is straight lines rather than a chevron - a chevron
  // read as a second arrowhead pointing back the other way.
  ranged: icon([
    '                ',
    '                ',
    '                ',
    '            ..  ',
    '  CCCCC    .WW. ',
    '  ......  .WWWW.',
    ' .bBBBBBBBWWWWW.',
    ' .bBBBBBBBWWWWW.',
    '  ......  .WWWW.',
    '  CCCCC    .WW. ',
    '            ..  ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ]),
}

/**
 * Fight, which is the one rail entry that is not a skill.
 *
 * Blue crossed with orange, because that is literally what the fight is - the colour
 * language does the work, and the shape says "combat" in every game anyone has played.
 */
export const FIGHT_ICON: Sprite = icon([
  '                ',
  ' ..          .. ',
  ' .B..      ..O. ',
  '  .BB.    .OO.  ',
  '   .BB.  .OO.   ',
  '    .BB..OO.    ',
  '     .BOOB.     ',
  '      .WW.      ',
  '      .WW.      ',
  '     .OBBO.     ',
  '    .OO..BB.    ',
  '   .OO.  .BB.   ',
  '  .OO.    .BB.  ',
  ' .O..      ..B. ',
  ' ..          .. ',
  '                ',
])

/**
 * Damage type icons.
 *
 * These carry real mechanical weight - resistances are multiplicative and several boss
 * fights turn entirely on bringing the right one - so they get shapes with nothing else
 * in common, not three variations on a spark.
 *
 * Deliberately *not* the same metaphor as the Ranged skill icon, which is also a
 * projectile: kinetic is a solid wedge with no trail, Ranged is a bolt with one.
 */
export const DAMAGE_ICONS: Readonly<Record<string, Sprite>> = {
  // A wedge. Mass arriving, with nothing clever about it.
  kinetic: icon([
    '                ',
    '                ',
    '    ..          ',
    '    .S..        ',
    '    .SSS..      ',
    '    .SSSSS..    ',
    '    .SSSSSSS..  ',
    '    .SWWWWWWS.  ',
    '    .SWWWWWWS.  ',
    '    .SSSSSSS..  ',
    '    .SSSSS..    ',
    '    .SSS..      ',
    '    .S..        ',
    '    ..          ',
    '                ',
    '                ',
  ]),
  // A bolt.
  energy: icon([
    '                ',
    '        ..      ',
    '       .CC.     ',
    '      .CCC.     ',
    '     .CCC.      ',
    '    .CCC.       ',
    '   .CCCCCC.     ',
    '   .CCCCCC.     ',
    '     ..CCC.     ',
    '      .CCC.     ',
    '     .CCC.      ',
    '    .CCC.       ',
    '   .CC.         ',
    '   ..           ',
    '                ',
    '                ',
  ]),
  // A pulse going outward. Hollow rings, so it does not read as the reactor core.
  emp: icon([
    '                ',
    '      ....      ',
    '    ..VVVV..    ',
    '   .V......V.   ',
    '  .V..VVVV..V.  ',
    ' .V..V....V..V. ',
    ' .V..V.VV.V..V. ',
    ' .V..V.VV.V..V. ',
    ' .V..V....V..V. ',
    '  .V..VVVV..V.  ',
    '   .V......V.   ',
    '    ..VVVV..    ',
    '      ....      ',
    '                ',
    '                ',
    '                ',
  ]),
}

/**
 * Equipment slot icons.
 *
 * One per slot rather than one per item, and for a different reason than the category
 * icons: every equippable part shares the category "part", so a category icon would
 * make all five slots identical. The slot is the thing that differs, and an empty slot
 * needs to say what belongs in it before anything is fitted.
 */
export const SLOT_ICONS: Readonly<Record<string, Sprite>> = {
  // A torso. The thing everything else bolts onto.
  frame: icon([
    '                ',
    '     ......     ',
    '    .bBBBBb.    ',
    '   ..BWWWWB..   ',
    '  .BBBBBBBBBB.  ',
    '  .BB.bBBb.BB.  ',
    '  .BB.BWWB.BB.  ',
    '  .BB.BWWB.BB.  ',
    '  .BB.bBBb.BB.  ',
    '  .BBBBBBBBBB.  ',
    '   ..BBBBBBB..  ',
    '    .bB..Bb.    ',
    '    ...  ...    ',
    '                ',
    '                ',
    '                ',
  ]),
  // A manipulator: shoulder, upper arm, and a hand that closes.
  arms: icon([
    '                ',
    '  ......        ',
    '  .bBBBb.       ',
    '  .BWWWB.       ',
    '  .bBBBb...     ',
    '  ...BBBBBb..   ',
    '     .BBBBBBb.  ',
    '      ..BBBBB.  ',
    '       .BB..BB. ',
    '       .B.  .B. ',
    '       ...  ... ',
    '                ',
    '                ',
    '                ',
    '                ',
    '                ',
  ]),
  // A leg bent to one side, ending on a tracked foot. Drawn asymmetric on purpose: a
  // symmetric hip-shin-foot read as a table, and shared a silhouette with the anvil.
  legs: icon([
    '                ',
    '   ......       ',
    '  .bBBBBb.      ',
    '  .BWWWWB.      ',
    '  .bBBBBb.      ',
    '   .BBBB.       ',
    '    .BBB.       ',
    '     .BBB.      ',
    '      .BBB.     ',
    '      .BBB.     ',
    '     ..BBB..    ',
    '   .bBBBBBBb.   ',
    '   .B.B.B.B.B.  ',
    '   ..........   ',
    '                ',
    '                ',
  ]),
  // A barrel with a muzzle and a grip under it.
  weapon: icon([
    '                ',
    '                ',
    '                ',
    '  ...........   ',
    '  .bBBBBBBBb.C  ',
    '  .BWWWWWWWB.CC ',
    '  .bBBBBBBBb.C  ',
    '  .....BB....   ',
    '      .BB.      ',
    '      .BB.      ',
    '     .bBBb.     ',
    '     ......     ',
    '                ',
    '                ',
    '                ',
    '                ',
  ]),
  // A core, lit. Everything else is dead without it.
  reactor: icon([
    '                ',
    '      ....      ',
    '     .bBBb.     ',
    '   ...bBBb...   ',
    '  .bBBBBBBBBb.  ',
    '  .BBCCCCCCBB.  ',
    '  .BCCWWWWCCB.  ',
    '  .BCWWWWWWCB.  ',
    '  .BCWWWWWWCB.  ',
    '  .BCCWWWWCCB.  ',
    '  .BBCCCCCCBB.  ',
    '  .bBBBBBBBBb.  ',
    '   ...bBBb...   ',
    '     .bBBb.     ',
    '      ....      ',
    '                ',
  ]),
}

/**
 * Item icons, one per category rather than one per item.
 *
 * Seventy items is more art than this project can carry - the same call that gave the
 * enemy roster four archetype sprites instead of twenty-six. The category still tells a
 * player the thing they actually want at a glance: is this raw stock, a finished part,
 * or something I burn.
 */
export const CATEGORY_ICONS: Readonly<Record<string, Sprite>> = {
  // A bar sitting squarely on a bigger one. Raw stock.
  material: icon([
    '                ',
    '                ',
    '                ',
    '                ',
    '    ........    ',
    '   .bBBBBBBb.   ',
    '   .BWWWWWWB.   ',
    '   .bBBBBBBb.   ',
    '  ............  ',
    '  .bBBBBBBBBb.  ',
    '  .BWWWWWWWWB.  ',
    '  .bBBBBBBBBb.  ',
    '  ............  ',
    '                ',
    '                ',
    '                ',
  ]),
  // A board with traces and two legs. Something that was made.
  component: icon([
    '                ',
    '   ..........   ',
    '   .bbbbbbbb.   ',
    '   .bCCbbCCb.   ',
    '   .bCbbbbCb.   ',
    '   .bbbCCbbb.   ',
    '   .bCbCCbCb.   ',
    '   .bCbbbbCb.   ',
    '   .bbCCCCbb.   ',
    '   .bCbbbbCb.   ',
    '   .bbbbbbbb.   ',
    '   ..........   ',
    '    .W.  .W.    ',
    '    .W.  .W.    ',
    '                ',
    '                ',
  ]),
  // A bolted plate. Something you fit.
  part: icon([
    '                ',
    '  ............  ',
    '  .bBBBBBBBBb.  ',
    '  .BWb....bWB.  ',
    '  .BB......BB.  ',
    '  .BB.BBBB.BB.  ',
    '  .BB.BWWB.BB.  ',
    '  .BB.BWWB.BB.  ',
    '  .BB.BBBB.BB.  ',
    '  .BB......BB.  ',
    '  .BWb....bWB.  ',
    '  .bBBBBBBBBb.  ',
    '  ............  ',
    '                ',
    '                ',
    '                ',
  ]),
  // A flask, lit. You spend it the moment you find it.
  fuel: icon([
    '                ',
    '     ......     ',
    '     .bWWb.     ',
    '     .b..b.     ',
    '     .b..b.     ',
    '    ..b..b..    ',
    '   .bb....bb.   ',
    '   .bOOOOOOb.   ',
    '  ..bOOOOOOb..  ',
    '  .bOOWWWWOOb.  ',
    '  .bOOWWWWOOb.  ',
    '  .bOOOOOOOOb.  ',
    '  ..bbbbbbbb..  ',
    '   ..........   ',
    '                ',
    '                ',
  ]),
}

/**
 * Rail icons for the things that are not skills.
 *
 * The Character and Saves groups were the only rows in the rail with nothing beside
 * them, which made them read as a footer rather than as part of the same list. These
 * follow every rule the skill icons do - 16x16, the shared palette, and told apart by
 * silhouette rather than by colour.
 *
 * Each one was checked against what it sits near. `equipment` is deliberately not a
 * torso, because `SLOT_ICONS.frame` already is one; `crawler` is low and wide where
 * `SLOT_ICONS.legs` is a tall bent leg; and nothing here hangs three prongs downward,
 * because that silhouette is Scavenging's.
 */
export const MENU_ICONS: Readonly<Record<string, Sprite>> = {
  // You, inside brackets: a figure framed by four corner marks. The page is what is
  // fitted to your body, so the icon is a body with a selection drawn around it.
  //
  // The first pass drew the figure small enough that it read as a blob between the
  // brackets - which is what the rule about checking an icon beside its neighbours is
  // for. It fills the frame now: head, shoulders, and a lit core.
  equipment: icon([
    '                ',
    '  ...      ...  ',
    '  .B.      .B.  ',
    '  .B.      .B.  ',
    '  ...      ...  ',
    '      .WW.      ',
    '     .bWWb.     ',
    '   ..BBBBBB..   ',
    '   .BBBWWBBB.   ',
    '   .BBBWWBBB.   ',
    '   .BBBBBBBB.   ',
    '   ..BB..BB..   ',
    '  ... B.  .B    ',
    '  .B.      .B.  ',
    '  .B.      .B.  ',
    '  ...      ...  ',
  ]),
  // A workshop on tracks: low, wide, and all chassis. The second body in the world.
  crawler: icon([
    '                ',
    '                ',
    '                ',
    '     .......    ',
    '    .bBBBBBb.   ',
    '   .BBWWWWWBB.  ',
    '  .BBBBBBBBBBB. ',
    '  .bBBBBBBBBBb. ',
    '  ............. ',
    ' ...............',
    ' .bBBBBBBBBBBBb.',
    ' .B.B.B.B.B.B.B.',
    ' .bBBBBBBBBBBBb.',
    ' ...............',
    '                ',
    '                ',
  ]),
  // A braced crate. Everything you are holding and not carrying.
  bank: icon([
    '                ',
    '                ',
    '  ............  ',
    '  .bBBBBBBBBb.  ',
    '  .BW......WB.  ',
    '  .B.bB..Bb.B.  ',
    '  .B..bBBb..B.  ',
    '  .B...BB...B.  ',
    '  .B...BB...B.  ',
    '  .B..bBBb..B.  ',
    '  .B.bB..Bb.B.  ',
    '  .BW......WB.  ',
    '  .bBBBBBBBBb.  ',
    '  ............  ',
    '                ',
    '                ',
  ]),
  // A page with a corner turned down. What you have remembered, written out.
  log: icon([
    '                ',
    '   ........     ',
    '   .bBBBBb..    ',
    '   .BWWWWB.b.   ',
    '   .BBBBBB...   ',
    '   .BWWWWWWB.   ',
    '   .BBBBBBBB.   ',
    '   .BWWWWWWB.   ',
    '   .BBBBBBBB.   ',
    '   .BWWWWWWB.   ',
    '   .BBBBBBBB.   ',
    '   .BWWWWB.B.   ',
    '   .bBBBBBBb.   ',
    '   .........    ',
    '                ',
    '                ',
  ]),
  /**
   * One icon for all three slots, not three.
   *
   * A fill level would have been the obvious idea - empty, half, full - and it is a
   * claim the icon cannot keep: "Your game" is at whatever stage the player has
   * actually reached, which is as likely to be past Endgame's as behind Mid-game's.
   * The names say which is which; the icon says *this row is a save*, which is the
   * job every other icon in the rail is doing.
   */
  save: icon([
    '                ',
    '                ',
    '   .........    ',
    '  .bBBBBBBBb.   ',
    '  .BB.....BB.   ',
    '  .BB.WWW.BB.   ',
    '  .BB.WWW.BB.   ',
    '  .BBBBBBBBB.   ',
    '  .BWWWWWWWB.   ',
    '  .BW.....WB.   ',
    '  .BW.....WB.   ',
    '  .BWWWWWWWB.   ',
    '  .bBBBBBBBb.   ',
    '   .........    ',
    '                ',
    '                ',
  ]),
  // Skip back to the start. Steel rather than blue: this is an action, not a place, and
  // the row it sits on is the only one in the rail that destroys something.
  reset: icon([
    '                ',
    '                ',
    '                ',
    '    ..     ..   ',
    '    .S.   .SS.  ',
    '    .S.  .SSS.  ',
    '    .S. .SSSS.  ',
    '    .S..SSSSS.  ',
    '    .S..SSSSS.  ',
    '    .S. .SSSS.  ',
    '    .S.  .SSS.  ',
    '    .S.   .SS.  ',
    '    ..     ..   ',
    '                ',
    '                ',
    '                ',
  ]),
}


// ---------------------------------------------------------------------------
// The place the mech stands in
// ---------------------------------------------------------------------------

/**
 * Backdrop colours: every one of them recedes.
 *
 * **No signal colour appears here at all** - no orange, no cyan, no player blue. The
 * colour language says orange is hostile and cyan is a live readout, and a backdrop that
 * borrowed either would put something in the scenery a player has been trained to look
 * at.
 *
 * The towers are *lighter* than the sky, not darker. Silhouetting them was the first
 * try and it disappeared: the sky at the horizon is already near-black here, so a darker
 * tower has nothing to be dark against. Concrete catching the last of the light does,
 * and it also puts the brightest thing at the horizon rather than at the bottom of the
 * frame, which is what makes the distance read as distance.
 */
const SCENE_PALETTE: Readonly<Record<string, string>> = {
  h: '#101e33', // haze, barely above the sky - it softens the tower bases, nothing more
  f: '#12213a', // a far tower, barely separated from the sky
  F: '#17293f', // its lit face
  d: '#1a2b45', // a near tower, lighter than the sky behind it
  D: '#26405f', // its lit face, so a tower has a direction
  r: '#101d30', // rubble, the darkest thing here: it is in the towers' shadow
  R: '#1a2c46', // the top edge of a mound, catching the same light the towers do
  e: '#2e4c6e', // the ground line - the brightest edge in the scene, and the only one
  g: '#16243a', // ground
  G: '#1e3350', // a plate in the ground, so the floor has a surface
  // The foreground. Nearest, so lightest: these are the only things in the backdrop
  // brighter than the ground line, which is what puts them in *front* of the floor
  // rather than on it. Still desaturated - a saturated chunk would compete with the mech.
  k: '#24395a', // a mass of rubble
  K: '#35577e', // its lit top edge
  s: '#0f1a2b', // the shadow it casts, and the only thing darker than the ground
}

/**
 * Where you are: a dead skyline over rubble, and a floor to stand on.
 *
 * **Authored at 48x36 rather than 16x16**, which is the one place the art rules bend, so
 * it needs a reason. Sixteen pixels is a *thing* - an item, a face, a silhouette read in
 * one glance. This is a place, and a place is mostly relationships between things: how
 * far the towers sit behind the rubble, how much sky is above them. At 16x16 there is no
 * room for a relationship, only for one shape.
 *
 * The scale is **not** chosen to fit the panel. It is fixed at the mech's own scale and
 * the overflow is cropped, because fitting would mean a fractional scale - the thing that
 * turns pixel art to mush - and because a backdrop whose pixels are a different size from
 * the figure standing on it does not read as one world.
 *
 * The top third is empty on purpose: the CSS sky gradient shows through, so the sky stays
 * smooth where smooth is right and the art starts where the horizon does.
 *
 * The foreground rubble runs through the **middle** as well as the edges, deliberately.
 * A phone crops this to its middle third, so debris placed only at the sides would be a
 * foreground that exists on a desktop and nowhere else.
 */
/**
 * Which row of the backdrop is the surface. The figures' feet are placed from this
 * rather than from a percentage, so moving the ground line in the art moves what stands
 * on it - a percentage would just quietly stop matching.
 */
export const SCENE_GROUND_ROW = 26

export const SCENE_BACKDROP: Sprite = {
  palette: SCENE_PALETTE,
  rows: [
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                                                ',
    '                    dD                          ',
    '                    dD                          ',
    '                   ddD                          ',
    '  Dd  dd           ddD                          ',
    '  Dddddd           ddD              fffffF      ',
    'FfDddddd           ddD Ffffffff     fffffF      ',
    'FfDddddd  Fffffff  ddD Ffffffff     fffffF      ',
    'FfDdDddd  Fffffff  ddD FfffDd  dd   fffffF      ',
    'FfDddddd  FfDdddf  ddD FfffDd  dddd ffffdddddD  ',
    'FfDddddd  FfDdddf  ddD FfffDdddddddhffffdddddD  ',
    'FfDdddDd hFfDdddfhhddDhFfffDdDdddddhffffdddddDhh',
    'FfDdddddhhFfDdDdfhhddDhFfffDddddDddhffffdddDdDhh',
    'FfDddddd  FfDdddf  ddD FfffDddddddd ffffdddddD  ',
    '      RRRRRRRRRRRR      RRRRRRRRRRRR    RRRRRRRR',
    'RRRRRRRRRrrrrrrRRRRRRRRRRRRrrrrrRRRRRRRRRRRRrrrr',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    'gggggggggGGggggggggggkKgggGGgggggggggggggggggggg',
    'gggggggggggkKggggGGgggggggkKggggggggGGGGGGGGGggg',
    'ggggKKGGGGGGGgggggggKKKgggggggggggggkKggggggGGgg',
    'ggKKKKsggkKggggggggsssssggggggggKKKgggggggggkKgg',
    'KKKKKKKgggggggggggggGGGkKGGGGGgsssssggKKKKKKKKKK',
    'kkkkkkkggggggggKKKggggggggggggkKggggggkkkkkkkkkk',
    'kkkkkkkggggggKKKKKKKgggGGggKKKgggggKKKsssKKKKKss',
    'kkkkkkkgkKggGkkkkkkkggggKKKKKKKKgggkkkgggkkkkkgg',
    'kkkkkkkggggggkkkkkkkggggkkkkkkkkGGsssssGGkkkkkgg',
  ],
}
