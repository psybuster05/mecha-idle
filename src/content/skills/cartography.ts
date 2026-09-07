import type { SkillDef } from '../types'

/**
 * Cartography - knowing the ground.
 *
 * This skill has now been given away twice. Unlocking zones was its first job, and
 * bosses took that, because a skill that gated regions would break the rule that combat
 * widens rather than blocks. Travel time was its second, and travel is gone.
 *
 * What is left is the honest reading of what a surveyor is worth to a scavenger: knowing
 * the ground means finding more in it. Levelling this raises the chance of a bonus haul
 * on *every* gathering completion, in every skill - the same axis the boss yield perks
 * sit on, so the two stack into one legible number.
 *
 * It is deliberately passive. There is nothing to remember to trigger, which suits a
 * game played in glances, and it makes Cartography the skill you level to make the other
 * skills worth more rather than one that competes with them.
 */
export const CARTOGRAPHY: SkillDef = {
  id: 'cartography',
  name: 'Cartography',
  description:
    'Survey and route-finding. The maps you were given were thirty-one years out of date the moment you woke, so you have been making your own.',
  actions: [
    {
      id: 'pace_the_hollow',
      name: 'Pace The Hollow',
      description: 'Start with the tunnel you sleep in. It takes longer than you expect.',
      levelRequired: 1,
      duration: 3,
      outputs: [{ item: 'scrap_steel', qty: 1 }],
      xp: 3,
    },
    {
      id: 'chart_roadways',
      name: 'Chart The Roadways',
      description: 'Every route out of the district, and which of them are still routes.',
      levelRequired: 10,
      duration: 4,
      outputs: [{ item: 'copper_wiring', qty: 1 }],
      drops: [{ item: 'scrap_steel', qty: 2, chance: 0.5 }],
      xp: 5,
    },
    {
      id: 'triangulate_ruins',
      name: 'Triangulate The Ruins',
      description: 'Three fixed points and a great deal of walking between them.',
      levelRequired: 20,
      duration: 4,
      outputs: [{ item: 'copper_wiring', qty: 2 }],
      xp: 7,
    },
    {
      id: 'survey_slag',
      name: 'Survey The Slag',
      description: 'Mapping ground that is still moving is mostly a matter of going back.',
      levelRequired: 30,
      duration: 5,
      outputs: [
        { item: 'titanium_shard', qty: 1 },
        { item: 'scrap_steel', qty: 2 },
      ],
      xp: 12,
    },
    {
      id: 'plot_coast',
      name: 'Plot The Coastline',
      description: 'The charts say the water is a mile further in. You are correcting them.',
      levelRequired: 45,
      duration: 5,
      outputs: [{ item: 'hull_plate', qty: 2 }],
      xp: 16,
    },
    {
      id: 'log_approaches',
      name: 'Log The Approaches',
      description: 'Every way in and every way out, which turn out not to be the same list.',
      levelRequired: 60,
      duration: 6,
      outputs: [{ item: 'airframe_spar', qty: 2 }],
      drops: [{ item: 'avionics_board', qty: 1, chance: 0.12 }],
      xp: 27,
    },
    {
      id: 'map_mainland',
      name: 'Map The Mainland',
      description: 'A whole landmass nobody has surveyed since the switch. It takes months.',
      levelRequired: 75,
      duration: 6,
      outputs: [{ item: 'conduit_spool', qty: 2 }],
      xp: 38,
    },
    {
      id: 'fix_the_grid',
      name: 'Fix The Grid',
      description:
        'Everything, tied to one reference. You can find any point on it from any other.',
      levelRequired: 90,
      duration: 7,
      outputs: [
        { item: 'command_plate', qty: 2 },
        { item: 'conduit_spool', qty: 2 },
      ],
      xp: 63,
    },
  ],
}

/**
 * Bonus-haul chance per level of Cartography.
 *
 * Counted from level 1, so an untrained surveyor changes nothing at all. At 99 it is a
 * +29.4% chance of a second haul on any gathering completion, in any skill.
 *
 * That is deliberately about two thirds of what beating every boss in the game is worth
 * on the same axis. Levelling one skill to the top should be a serious reward and still
 * lose to clearing the world - if it won, the fastest route through an idle game would
 * be to ignore all of it except this.
 */
export const SURVEY_BONUS_PER_LEVEL = 0.003
