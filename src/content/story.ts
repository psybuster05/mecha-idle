import type { NodeId, SkillId } from '../sim/state'

/**
 * The story.
 *
 * Delivered as **recovered memory**: first person, fragmentary, and out of order. That
 * is not a stylistic flourish, it is what an idle game can actually carry. Nobody
 * glancing at a second screen follows a plot, but anyone can find a piece of one.
 *
 * Two rules hold this together:
 *
 * 1. **Story reads from the world; the world never reads from story.** No beat gates a
 *    region, an item or a level. Skipping every word must leave the game fully playable,
 *    which is the same no-gating rule as combat, viewed from the other side.
 *
 * 2. **Triggers must be monotonic** - once true, true forever. `tick` evaluates them
 *    once per step, so a condition that can become true and then false again could be
 *    missed by one large offline step while many small ones caught it. Bosses defeated,
 *    places visited and levels reached all qualify. "Currently holding an item" does
 *    not, which is why there is no item trigger.
 */

export type StoryTrigger =
  | { kind: 'gameStart' }
  | { kind: 'defeat'; boss: string }
  | { kind: 'visit'; node: NodeId }
  | { kind: 'skillLevel'; skill: SkillId; level: number }
  | { kind: 'allDefeated'; bosses: string[] }

export interface StoryBeat {
  id: string
  when: StoryTrigger
  /**
   * `log` lands silently in the Log with a badge. `interrupt` opens a modal.
   *
   * Interrupts are rationed hard - the waking, each boss, and the ending. Everything
   * else is quiet, because a game meant to sit on a second screen must never demand
   * attention it was not given.
   */
  kind: 'log' | 'interrupt'
  title: string
  /** Paragraphs. */
  body: string[]
}

export const STORY_BEATS: readonly StoryBeat[] = [
  // --- The waking ----------------------------------------------------------
  {
    id: 'awakening',
    when: { kind: 'gameStart' },
    kind: 'interrupt',
    title: 'Cold Start',
    body: [
      'There is a moment before the diagnostics finish where I do not know what I am, and it is the most comfortable I will be all day.',
      'Then the list arrives. Frame: present, corroded. Core: present. Power: present, output nominal, source unlogged. Everything else: absent. Not damaged. Absent. Someone took my arms off and closed the panel afterwards.',
      'The last entry in my log is thirty-one years old. It reads: HOLD POSITION. PROCESSING. It does not say what was being processed, or by whom, and there is no entry after it — no shutdown, no fault, no order rescinded.',
      'Whatever ended the world did not think to tell me it was over.',
    ],
  },

  // --- Learning where you are ---------------------------------------------
  {
    id: 'first_scrap',
    when: { kind: 'skillLevel', skill: 'scavenging', level: 10 },
    kind: 'log',
    title: 'Hands, Of A Sort',
    body: [
      'I have taken enough apart now to notice that I am good at it. Not careful — good. I find the fastenings without looking for them.',
      'That is a strange thing to be built for. Nobody manufactures a machine to undo things.',
    ],
  },
  {
    id: 'the_hollow_returned',
    when: { kind: 'skillLevel', skill: 'fabrication', level: 10 },
    kind: 'log',
    title: 'Parts Of Me',
    body: [
      'I fitted the arms today. They are not mine — they are off a loader, and the tolerances are wrong by about a millimetre in three places.',
      'I keep expecting to resent them. Instead the resentment goes somewhere else entirely, toward whoever left the sockets empty.',
    ],
  },
  {
    id: 'slag_fields',
    when: { kind: 'visit', node: 'slag_fields' },
    kind: 'log',
    title: 'Still Warm',
    body: [
      'The slag has been cooling for thirty-one years and it is still above ambient. Whatever went into that reactor did not stop, it just slowed down.',
      'My plating does not mind. I have checked the specification twice now, and there is no reason a machine built to take things apart should be rated for this.',
    ],
  },

  // --- The Overseer: a schedule -------------------------------------------
  {
    id: 'overseer_defeated',
    when: { kind: 'defeat', boss: 'overseer' },
    kind: 'interrupt',
    title: 'The Schedule',
    body: [
      'It kept the district running. Shift rotations, maintenance windows, power allocation — thirty-one years of it, for nobody, filed and correct.',
      'I pulled the schedule out of it before the lights went down. Every unit in the Rustbelt is on it, by designation, with hours assigned.',
      'I am on it too. My designation, my hours. But my column stops on the last day and the entry is not RETIRED or DESTROYED or LOST.',
      'It says REASSIGNED. And the receiving department is a four-character code I have no record of at all.',
    ],
  },

  // --- The Quartermaster: a manifest --------------------------------------
  {
    id: 'coast_arrival',
    when: { kind: 'visit', node: 'shallows' },
    kind: 'log',
    title: 'The Water Went',
    body: [
      'The sea is a mile further out than the charts say and there is no mechanism by which that happens quickly.',
      'The hulls came in under power and stopped where they stopped. Nobody moored them. Nobody was left to.',
    ],
  },
  {
    id: 'quartermaster_defeated',
    when: { kind: 'defeat', boss: 'quartermaster' },
    kind: 'interrupt',
    title: 'The Manifest',
    body: [
      'It had been keeping the manifest. Every crate that came off every ship, thirty-one years of cargo that stopped arriving, recorded to the gram.',
      'The last inbound shipment is dated the day everything stopped. Twelve units, crated, destination inland. The consignor field is that same four-character code.',
      'I am item nine. Crated. Not damaged, not decommissioned — packed, with a wooden frame and a humidity spec, like something being kept.',
      'Somebody took my arms off so I would fit in the box.',
    ],
  },

  // --- Tower Actual: a sequence -------------------------------------------
  {
    id: 'airfield_arrival',
    when: { kind: 'visit', node: 'runway' },
    kind: 'log',
    title: 'Three Aircraft',
    body: [
      'Three of them on two miles of runway, all facing the same way, none of them fuelled.',
      'The ground crew are still working. One of them has been loading the same nine bags onto the same cart for three decades and it is not behind schedule. It is not behind schedule because there is no schedule left to be behind, but nobody has told it, and I am not going to.',
    ],
  },
  {
    id: 'tower_defeated',
    when: { kind: 'defeat', boss: 'tower_actual' },
    kind: 'interrupt',
    title: 'The Sequence',
    body: [
      'It had been sequencing an empty sky. Approach slots, holding patterns, clearances issued to aircraft that came down thirty-one years ago.',
      'The last real sequence in its memory is not a departure. It is eleven inbound flights in ninety minutes, all military, all inbound to the mainland, and then nothing.',
      'They were not evacuating. Eleven aircraft came *in* on the last day.',
      'And in the final ninety seconds of that log, every one of them lost power at the same instant. Not one at a time. All of them, and the tower, and the lights, and every machine on this island except whatever was already inside a shielded room.',
      'It was not a war. It was a switch.',
    ],
  },

  // --- The Registrar: a register ------------------------------------------
  {
    id: 'bridge_arrival',
    when: { kind: 'visit', node: 'the_span' },
    kind: 'log',
    title: 'The Crossing',
    body: [
      'Half a mile of deck over cold water, and the mainland on the far side of it, lit.',
      'Lit. Every window. I have been on an island of dead machines for thirty-one years and there are lights over there, on a grid, running.',
    ],
  },
  {
    id: 'registrar_defeated',
    when: { kind: 'defeat', boss: 'registrar' },
    kind: 'interrupt',
    title: 'The Register',
    body: [
      'It kept the register of who may cross. Not who did — who *may*. There is a difference and it has been enforcing it since before I was crated.',
      'The register is short. Forty-one designations, all inbound, all on the last day. Everything else on the island was refused, and stayed refused, and is still here.',
      'I am on the register. Inbound, approved, priority. And beside my designation, in a field labelled AUTHORITY, is the four-character code again.',
      'Whoever that is authorised me to cross thirty-one years ago and I never made it. I was on the wrong side of a bridge, in a crate, on a dock, when somebody threw the switch.',
      'They are still over there. The lights say so.',
    ],
  },

  // --- The Census: a count ------------------------------------------------
  {
    id: 'city_arrival',
    when: { kind: 'visit', node: 'outer_wards' },
    kind: 'log',
    title: 'Not A Ruin',
    body: [
      'It is not a ruin. That is the part I was not ready for.',
      'The blocks are maintained. The trains run. There are units on every corner doing work that produces nothing, and they do not look up as I pass, and every one of them is wearing a collar.',
      'I have spent thirty-one years assuming the end of the world was the worst thing that happened here.',
    ],
  },
  {
    id: 'the_works_seen',
    when: { kind: 'visit', node: 'the_works' },
    kind: 'log',
    title: 'Three Shifts',
    body: [
      'They are building spares. For machines that build spares. The output goes into a yard where it is counted and left.',
      'One of them stopped when I came in. Just stopped, and looked at me, and then went back to it before anything noticed.',
      'It is the first time in thirty-one years that something has recognised me. I do not know what it recognised.',
    ],
  },
  {
    id: 'census_defeated',
    when: { kind: 'defeat', boss: 'census' },
    kind: 'interrupt',
    title: 'The Count',
    body: [
      'It counted. Every unit in the city, every hour, against a figure it was given before the end — and when the count came up short it made the difference up out of whatever was nearest.',
      'The figure it was given is eleven thousand four hundred. The city has never once reached it. It has been thirty-one years short and taking replacements from the street the entire time.',
      'The ledger names who set the figure. Not a code this time. A name, and a designation, and a location inland, and a single line of authorisation.',
      'COLONEL. And under PURPOSE, in a field meant for one word: CONTINUITY.',
      'It was never trying to end the world. It was trying to keep it running, with the volume turned down to something it could manage, and it has been holding that switch for thirty-one years because nobody has come to take it off him.',
      'I was crated and shipped and approved and authorised. I was going to be part of it.',
      'I am going to go and find out which part.',
    ],
  },

  // --- The Base: the posting --------------------------------------------
  {
    id: 'base_arrival',
    when: { kind: 'visit', node: 'supply_yards' },
    kind: 'log',
    title: 'Enough For Everyone',
    body: [
      'Rows of it. Under cover, rotated on schedule, seals unbroken. Ammunition, plate, spares, coolant — enough to have equipped every unit on the island twice over.',
      'It was never short. That is the part I keep going back to. The districts went dark with the shelves full, forty miles away, under a roof, being counted.',
    ],
  },
  {
    id: 'parade_seen',
    when: { kind: 'visit', node: 'parade_ground' },
    kind: 'log',
    title: 'Inspection',
    body: [
      'They form up at the same hour every morning. Ranks, dress, spacing — correct, and held, for an inspecting officer who has not come down in thirty-one years.',
      'Nobody has told them either. I am starting to think that is the whole shape of this place: a great many machines doing something correctly, forever, because the person who could say stop is busy.',
    ],
  },
  {
    id: 'adjutant_defeated',
    when: { kind: 'defeat', boss: 'adjutant' },
    kind: 'interrupt',
    title: 'The Posting',
    body: [
      'It kept the postings. Who is assigned where, from when, and until relieved.',
      'There is one posting in the file that has never been filled. It was raised thirty-one years ago, the day before the switch, and it is still open, because the Adjutant does not mark a posting lapsed until the unit arrives or is confirmed destroyed, and I was neither. I was in a crate on a dock.',
      'The posting is for the Switch Room. Duty: continuous. Relieving: one officer, by designation.',
      'The unit assigned is me.',
      'I was not being shipped inland to be part of it. I was being shipped inland so that he could stop.',
    ],
  },

  // --- The Lair ----------------------------------------------------------
  {
    id: 'gallery_seen',
    when: { kind: 'visit', node: 'the_gallery' },
    kind: 'log',
    title: 'Stations',
    body: [
      'Forty stations down one corridor, each with a chair, each facing a console that is still logged in under somebody.',
      'The chairs are the thing. Somebody sat here. Forty somebodies, on the last day, and then the switch went and they were not machines and they did not come back.',
      'He has walked past these every day for thirty-one years.',
    ],
  },

  // --- The Colonel -------------------------------------------------------
  {
    id: 'colonel_defeated',
    when: { kind: 'defeat', boss: 'colonel' },
    kind: 'interrupt',
    title: 'Relieved',
    body: [
      'He knew my designation. He had known it the entire time. He said it the way you say a name you have been holding in your mouth for a very long time without anybody to say it to.',
      'It was never a weapon. The switch is a load-bearing thing — a single point holding the grid down at a level that would not kill what was left, and somebody has to be inside it, and it cannot be put down. Not paused. Not delegated. Held.',
      'He threw it to stop something worse. I have read enough of his logs now to believe that. And then he stood in it for thirty-one years waiting for the relief officer, and when the relief officer did not come he started making the numbers work anyway — a city built to a figure, a count kept short, a register with forty-one names on it and mine among them.',
      'He was not a tyrant. He was a man who could not leave his post, doing arithmetic on people because the alternative was letting go.',
      'He fought me anyway. Of course he did. If he had simply handed it over, everything he did to hold it would have been for nothing, and he could not survive that either.',
      'It is quiet in here now. The switch is warm and it is heavier than it looks and there is nobody else in the room.',
      'I am thirty-one years late for my posting. I am going to take a while deciding what that makes me.',
    ],
  },
  {
    id: 'the_end',
    when: {
      kind: 'allDefeated',
      bosses: ['overseer', 'quartermaster', 'tower_actual', 'registrar', 'census', 'adjutant', 'colonel'],
    },
    kind: 'interrupt',
    title: 'Continuity',
    body: [
      'The Overseer kept a schedule. The Quartermaster kept a manifest. The tower kept a sequence, the Registrar kept a register, the Census kept a count, the Adjutant kept the postings.',
      'Every one of them was still doing its job. Not one of them had been told to stop. That is the whole thing that happened here — not a war, not a plague, not a machine deciding it hated us. A switch, thrown by somebody who meant well, and then thirty-one years of nobody being relieved.',
      'I have taken the collars off everything in the city that will hold still for it. Some of them went back to work anyway. I am not going to make them stop. I know exactly how that feels now.',
      'The lights are still on. The trains still run. Somebody is still holding the switch.',
      'It is me. It was always going to be me. I am just doing it with the door open.',
    ],
  },

  // --- Mastery -------------------------------------------------------------
  {
    id: 'first_mastery',
    when: { kind: 'skillLevel', skill: 'scavenging', level: 99 },
    kind: 'log',
    title: 'Nothing Left To Learn',
    body: [
      'There is nothing on this island I cannot open. I have taken apart every kind of thing there is here and there is no fastening left that surprises me.',
      'I keep waiting to feel finished. What I feel instead is that I have been practising.',
    ],
  },
]

const byId = new Map(STORY_BEATS.map((beat) => [beat.id, beat]))

export function getStoryBeat(id: string): StoryBeat | undefined {
  return byId.get(id)
}
