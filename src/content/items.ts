import type { ItemDef } from './types'
import type { ItemId } from '../sim/state'

/**
 * Every item in the game.
 *
 * Ids are snake_case and permanent - they end up in save files, so renaming one is
 * a save migration, not a rename. Display names can change freely.
 */
export const ITEMS: readonly ItemDef[] = [
  // --- Raw salvage (Scavenging) -------------------------------------------
  {
    id: 'scrap_steel',
    name: 'Scrap Steel',
    description: 'Twisted structural steel. The ruins are made of it.',
    category: 'material',
  },
  {
    id: 'copper_wiring',
    name: 'Copper Wiring',
    description: 'Stripped from walls that no longer carry anything.',
    category: 'material',
  },
  {
    id: 'titanium_shard',
    name: 'Titanium Shard',
    description: 'Fragments of something built to outlast its makers. It did.',
    category: 'material',
  },
  {
    id: 'intact_servo',
    name: 'Intact Servo',
    description: 'Still holds tension. Rare, in a field of things that do not.',
    category: 'component',
  },
  {
    id: 'power_cell',
    name: 'Depleted Power Cell',
    description: 'Empty, but the casing is sound. That is the hard part.',
    category: 'component',
  },
  {
    id: 'sealed_bearing',
    name: 'Sealed Bearing',
    description: 'Packed in grease that never broke down. It still spins true.',
    category: 'component',
  },
  {
    id: 'optic_lens',
    name: 'Optic Lens',
    description: 'Ground glass, unclouded. Someone made this by hand.',
    category: 'component',
  },
  {
    id: 'carbon_weave',
    name: 'Carbon Weave',
    description: 'Lighter than the steel it outperforms. The old world knew things.',
    category: 'material',
  },
  {
    id: 'fused_core',
    name: 'Fused Core',
    description: 'Slagged into one mass by whatever ended everything. Still holds a charge.',
    category: 'component',
  },

  // --- Ship Graveyard salvage ----------------------------------------------
  //
  // A deliberately separate material line. The Graveyard is lateral content: these
  // feed a different *build*, not a better one, so nothing here is required to max a
  // skill. See the gating rule in CLAUDE.md.
  {
    id: 'hull_plate',
    name: 'Corroded Hull Plate',
    description: 'Thirty years of salt did what the war could not. Underneath, it is still good.',
    category: 'material',
  },
  {
    id: 'hydraulic_ram',
    name: 'Hydraulic Ram',
    description: 'Built to move a cargo door against the sea. It does not know the sea is gone.',
    category: 'component',
  },
  {
    id: 'sonar_array',
    name: 'Sonar Array',
    description: 'Still listening. Whatever it hears down there, it has stopped reporting.',
    category: 'component',
  },
  {
    id: 'pressure_hull',
    name: 'Pressure Hull Section',
    description: 'Cut from the Quartermaster itself. Rated for depths nothing here will ever see again.',
    category: 'component',
  },

  // --- Abandoned Airfield salvage -------------------------------------------
  //
  // Aerospace: light, precise, fragile. Feeds a build that avoids hits rather than
  // absorbing them - the opposite of the Graveyard's sealed heavy plate.
  {
    id: 'airframe_spar',
    name: 'Airframe Spar',
    description: 'Aluminium ribbing, machined to the gram. Nothing here was built heavier than it had to be.',
    category: 'material',
  },
  {
    id: 'avionics_board',
    name: 'Avionics Board',
    description: 'Redundant to a fault, and it needed to be. Three of everything, all still arguing.',
    category: 'component',
  },
  {
    id: 'turbine_blade',
    name: 'Turbine Blade',
    description: 'Single-crystal, grown not cast. It ran at temperatures that would have run the rest of the aircraft.',
    category: 'component',
  },
  {
    id: 'beacon_core',
    name: 'Approach Beacon Core',
    description: 'Pulled from the tower itself. It is still trying to guide something down.',
    category: 'component',
  },

  // --- Bridge Checkpoint salvage ---------------------------------------------
  //
  // Military security materials. This is the armour line, and the line that answers
  // armour - the checkpoint is where plate finally matters enough to need a reply.
  {
    id: 'ceramic_composite',
    name: 'Ceramic Composite',
    description: 'Shatters on purpose, one layer at a time, so that whatever is behind it does not.',
    category: 'material',
  },
  {
    id: 'barrier_segment',
    name: 'Barrier Segment',
    description: 'Poured to stop a vehicle at speed. It has never once been asked to.',
    category: 'material',
  },
  {
    id: 'security_core',
    name: 'Security Core',
    description: 'It holds a list of who may pass. Your designation is not on it, and never was.',
    category: 'component',
  },
  {
    id: 'crossing_writ',
    name: 'Crossing Writ',
    description: 'Cut from the Registrar. Authorisation to leave the island, thirty years after anyone needed it.',
    category: 'component',
  },

  // --- The City salvage -------------------------------------------------------
  //
  // The first place that is not a ruin. Everything here is in use, maintained, and
  // owned by something else - so what you take is stripped from workers who had almost
  // nothing to begin with. The materials are civilian and plentiful rather than rare.
  {
    id: 'conduit_spool',
    name: 'Conduit Spool',
    description: 'Live power, still distributed to every block on a schedule. Somebody is paying for it.',
    category: 'material',
  },
  {
    id: 'polymer_frame',
    name: 'Polymer Frame',
    description: 'Cheap, moulded, replaceable. So were the units built from it, and they knew.',
    category: 'material',
  },
  {
    id: 'control_collar',
    name: 'Control Collar',
    description: 'It comes off a worker in one piece and leaves a bright band of unweathered plating.',
    category: 'component',
  },
  {
    id: 'census_ledger',
    name: 'Census Ledger',
    description: 'Every designation in the city, with a column for what each was worth. Yours is in it now.',
    category: 'component',
  },

  // --- The Base and the Lair ------------------------------------------------
  //
  // Military supply, maintained and stocked, for a garrison that has been at readiness
  // for thirty-one years without being relieved.
  {
    id: 'munitions_case',
    name: 'Munitions Case',
    description: 'Sealed, dated, and rotated on schedule. The seals are unbroken. Nothing here has ever been issued.',
    category: 'material',
  },
  {
    id: 'command_plate',
    name: 'Command Plate',
    description: 'The good armour, the kind that was never sent to the districts. There was always enough. It was just never sent.',
    category: 'material',
  },
  {
    id: 'continuity_core',
    name: 'Continuity Core',
    description: 'Warm, and heavier than it should be. It has been running without pause for thirty-one years, and it is tired in a way you recognise.',
    category: 'component',
  },

  // --- Fuel ------------------------------------------------------------------
  //
  // Never crafted, only found, and always rare. Burning one is a small event rather
  // than a routine, which is why there is no recipe and no reason to stockpile.
  {
    id: 'catalyst_flask',
    name: 'Catalyst Flask',
    description: 'Something volatile that survived thirty-one years in a sealed case. It will not survive you.',
    category: 'fuel',
    fuel: { multiplier: 2, seconds: 600 },
  },
  {
    id: 'overcharge_cell',
    name: 'Overcharge Cell',
    description: 'Rated well past anything you should put through yourself. You are going to anyway.',
    category: 'fuel',
    fuel: { multiplier: 3, seconds: 420 },
  },

  // --- Refined stock (Refining) -------------------------------------------
  {
    id: 'steel_ingot',
    name: 'Steel Ingot',
    description: 'Reduced to something honest.',
    category: 'material',
  },
  {
    id: 'wire_spool',
    name: 'Wire Spool',
    description: 'Drawn fine enough to carry a signal again.',
    category: 'material',
  },
  {
    id: 'titanium_plate',
    name: 'Titanium Plate',
    description: 'Cast flat and true. Heavy in a way that feels like safety.',
    category: 'material',
  },
  {
    id: 'charged_cell',
    name: 'Charged Cell',
    description: 'Warm to the touch. You remember warmth.',
    category: 'component',
  },
  {
    id: 'bearing_assembly',
    name: 'Bearing Assembly',
    description: 'Trued and seated. Nothing you build with this will grind.',
    category: 'material',
  },
  {
    id: 'lens_array',
    name: 'Lens Array',
    description: 'Stacked and aligned. You can see the horizon properly for the first time.',
    category: 'material',
  },
  {
    id: 'weave_sheet',
    name: 'Weave Sheet',
    description: 'Pressed flat under heat. Takes a hit like plate at a third the mass.',
    category: 'material',
  },
  {
    id: 'marine_alloy',
    name: 'Marine Alloy',
    description: 'Brine-hardened. Shrugs off heat in a way steel never manages.',
    category: 'material',
  },
  {
    id: 'pressure_seal',
    name: 'Pressure Seal',
    description: 'Keeps the inside in and the outside out. You have come to value that.',
    category: 'material',
  },
  {
    id: 'alumide_sheet',
    name: 'Alumide Sheet',
    description: 'Rolled thin enough to flex and stiff enough not to. Weighs almost nothing.',
    category: 'material',
  },
  {
    id: 'guidance_module',
    name: 'Guidance Module',
    description: 'It knows exactly where it is at all times. You envy that.',
    category: 'component',
  },
  {
    id: 'ablative_ceramic',
    name: 'Ablative Ceramic',
    description: 'Layered and fired. It gives itself up a sheet at a time so you do not have to.',
    category: 'material',
  },
  {
    id: 'hardened_lattice',
    name: 'Hardened Lattice',
    description: 'Dense enough to blunt anything, and sharp enough to go through anything blunted.',
    category: 'material',
  },
  {
    id: 'sintered_polymer',
    name: 'Sintered Polymer',
    description: 'Fused back into something that will outlast the thing it was moulded for.',
    category: 'material',
  },
  {
    id: 'command_relay',
    name: 'Command Relay',
    description: 'Rebuilt from a collar, pointed the other way. It gives orders now instead of taking them.',
    category: 'component',
  },
  {
    id: 'field_alloy',
    name: 'Field Alloy',
    description: 'Mixed to a military specification that assumed resupply. There was never any resupply, and it is still perfect.',
    category: 'material',
  },
  {
    id: 'core_matrix',
    name: 'Core Matrix',
    description: 'Rebuilt from slag into something that hums again.',
    category: 'component',
  },

  // --- Equippable parts (Fabrication) --------------------------------------
  //
  // Arms carry skillSpeed and legs carry evasion. Your arms are the "unlockable
  // speed-up" axis - upgrading them is how you buy back time - and your legs are how
  // you are not where the shot went.
  {
    id: 'frame_steel',
    name: 'Welded Steel Frame',
    description: 'Not the chassis you were built with. It holds.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 25, armour: 2, resist: { kinetic: 0.9 } },
  },
  {
    id: 'arms_servo',
    name: 'Servo Arms',
    description: 'Salvaged actuators, re-tensioned. They answer faster than you expect.',
    category: 'part',
    slot: 'arms',
    stats: { accuracy: 5, damage: 2, skillSpeed: 0.08 },
  },
  {
    id: 'legs_tracked',
    name: 'Tracked Legs',
    description: 'Slower than the originals. Far harder to knock down.',
    category: 'part',
    slot: 'legs',
    stats: { armour: 3, hp: 10, evasion: 4 },
  },
  {
    id: 'weapon_rivet',
    name: 'Rivet Driver',
    description: 'A construction tool. It was never meant for this, and neither were you.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'any',
    stats: { accuracy: 3, damageType: 'kinetic', damageMultiplier: 1.15 },
  },
  {
    id: 'weapon_arc',
    name: 'Arc Projector',
    description: 'Cuts rather than strikes. Plate that laughs at impacts runs like wax.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'any',
    stats: { accuracy: 8, damageType: 'energy', damageMultiplier: 1.35 },
  },
  {
    id: 'weapon_pulse',
    name: 'Pulse Emitter',
    description: 'No hole, no scorch. Whatever was thinking in there simply stops.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'any',
    stats: { accuracy: 14, damageType: 'emp', damageMultiplier: 1.3 },
  },
  {
    id: 'reactor_cell',
    name: 'Cell Reactor',
    description: 'Steady output at last. The tremor in your servos stops.',
    category: 'part',
    slot: 'reactor',
    stats: { attackSpeed: 0.4, hp: 5, resist: { energy: 0.85 } },
  },
  {
    id: 'frame_titanium',
    name: 'Titanium Exoframe',
    description: 'You stop flinching at things that used to dent you.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 90, armour: 8, resist: { kinetic: 0.75, energy: 0.9 } },
  },
  {
    id: 'arms_precision',
    name: 'Precision Manipulators',
    description: 'Fine enough to strip a board without looking. Work goes faster now.',
    category: 'part',
    slot: 'arms',
    stats: { accuracy: 18, damage: 9, skillSpeed: 0.25 },
  },
  {
    id: 'legs_thruster',
    name: 'Thruster Legs',
    description: 'You do not so much walk as decide to be somewhere else.',
    category: 'part',
    slot: 'legs',
    stats: { armour: 9, hp: 30, evasion: 18, resist: { emp: 0.7 } },
  },
  // Graveyard parts are sidegrades, not upgrades. The Marine Exoframe trades raw
  // defence for genuine energy protection; the Harpoon trades cadence for weight.
  {
    id: 'frame_marine',
    name: 'Marine Exoframe',
    description: 'Sealed against a sea that is not there any more. Heat runs off it like water.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 70, armour: 6, resist: { energy: 0.6, emp: 0.85, kinetic: 1.05 } },
  },
  {
    id: 'weapon_harpoon',
    name: 'Harpoon Launcher',
    description: 'One shot, and a long wait. Everything it hits stays hit.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'ranged',
    stats: { accuracy: 6, damageType: 'kinetic', damageMultiplier: 2.25, attackSpeed: -1.0, cleave: 1 },
  },
  // Airfield parts: the light build. Low HP and thin armour, bought back with evasion,
  // speed and accuracy. Against anything that hits hard and rarely, being missed beats
  // being armoured.
  {
    id: 'frame_aeroshell',
    name: 'Aeroshell Frame',
    description: 'Built to fly, not to be shot at. You are much harder to hit and much sorrier when something lands.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 30, armour: 2, evasion: 46 },
  },
  {
    id: 'legs_vector',
    name: 'Vector Thrusters',
    description: 'Attitude jets meant for a landing gear bay. You cross the map like weather.',
    category: 'part',
    slot: 'legs',
    stats: { hp: 10, armour: 2, evasion: 30 },
  },
  {
    id: 'weapon_repeater',
    name: 'Arc Repeater',
    description: 'Barely a weapon on its own. It simply does not stop, and it does not miss.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'ranged',
    stats: { accuracy: 30, damageType: 'energy', damageMultiplier: 1.0, attackSpeed: 0.9 },
  },
  // Bridge parts: the armour question, and its answer.
  {
    id: 'weapon_lance',
    name: 'Breaching Lance',
    description: 'It does not hit armour. It finds the seam, and goes through it.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'melee',
    stats: { accuracy: 12, damageType: 'kinetic', damageMultiplier: 1.25, armourPierce: 0.75 },
  },
  {
    id: 'frame_bulwark',
    name: 'Bulwark Frame',
    description: 'Checkpoint plate, cut down to fit you. Slow, immovable, and very hard to convince.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 120, armour: 34, evasion: -18, resist: { kinetic: 0.7, energy: 0.85 } },
  },
  // City parts. A crowd rewards spread, not weight - the Disperser is a lighter,
  // faster cleave than the Harpoon, and it carries a different damage type.
  {
    id: 'weapon_disperser',
    name: 'Crowd Disperser',
    description: 'Built to move a queue along. It does not have to be aimed especially well.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'ranged',
    stats: { accuracy: 20, damageType: 'energy', damageMultiplier: 1.4, attackSpeed: 0.3, cleave: 0.6 },
  },
  {
    id: 'arms_labour',
    name: 'Labour Manipulators',
    description: 'Taken off a unit that had used them for thirty years without stopping. They know the work.',
    category: 'part',
    slot: 'arms',
    stats: { accuracy: 22, damage: 12, skillSpeed: 0.4 },
  },
  {
    id: 'reactor_grid',
    name: 'Grid Tap',
    description: 'You stop carrying your own power and start drawing the city grid. It does not notice.',
    category: 'part',
    slot: 'reactor',
    stats: { attackSpeed: 0.9, hp: 40, resist: { emp: 0.8 } },
  },
  // The last two. Not strictly better than what came before - a generalist frame and
  // a weapon that does a little of everything the game has taught, which is exactly
  // what the Colonel asks for.
  {
    id: 'frame_command',
    name: 'Command Frame',
    description: 'Built for whoever was going to hold this place after him. It fits you without adjustment, which is the worst thing you have learned all day.',
    category: 'part',
    slot: 'frame',
    stats: { hp: 150, armour: 26, evasion: 12, resist: { kinetic: 0.85, energy: 0.85, emp: 0.85 } },
  },
  {
    id: 'weapon_sentence',
    name: 'The Sentence',
    description: 'It goes through armour and it does not waste what is left over. You did not design it that way. You just needed both.',
    category: 'part',
    slot: 'weapon',
    combatClass: 'any',
    stats: {
      accuracy: 24,
      damageType: 'kinetic',
      damageMultiplier: 1.5,
      armourPierce: 0.7,
      cleave: 0.5,
    },
  },
] as const

const byId = new Map<ItemId, ItemDef>(ITEMS.map((item) => [item.id, item]))

export function getItem(id: ItemId): ItemDef | undefined {
  return byId.get(id)
}

/** Display name, falling back to the raw id so a missing item is visible, not silent. */
export function itemName(id: ItemId): string {
  return byId.get(id)?.name ?? id
}
