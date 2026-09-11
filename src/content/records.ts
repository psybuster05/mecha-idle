/**
 * What each boss keeps.
 *
 * The spine of the story is that every boss is still doing its job - the Overseer keeps a
 * schedule, the Quartermaster a manifest, the tower a sequence - and each record holds a
 * line about who you were. That line is the boss's defeat beat: you pull the record out of
 * it and find yourself on it.
 *
 * This table makes the record a thing in the game rather than only a paragraph in the Log.
 * Before a fight you can read the part of it that is the boss's own procedure - how it will
 * fight, phase by phase, written as entries in its own document. One entry is sealed. On
 * defeat it opens, and the sealed entry *is* the story beat - the same beat object the Log
 * shows, not a copy of its words - so the most useful thing in the game to read before a
 * boss and the story it is guarding are one document.
 *
 * Only names live here: the document, and what one entry in it is called. The phases come
 * from the enemy table and the sealed text from the story table, so nothing is written
 * twice.
 */

export interface BossRecord {
  boss: string
  /** The document the boss keeps, as its title. */
  document: string
  /** What one entry in that document is called: a shift, a line, a slot. */
  entry: string
  /** The story beat that is the record's sealed entry, opened on defeat. */
  beat: string
}

export const BOSS_RECORDS: readonly BossRecord[] = [
  // "Shift rotations, maintenance windows, power allocation - thirty-one years of it."
  { boss: 'overseer', document: 'Duty Schedule', entry: 'Shift', beat: 'overseer_defeated' },
  // "Every crate that came off every ship ... recorded to the gram."
  { boss: 'quartermaster', document: 'Cargo Manifest', entry: 'Line', beat: 'quartermaster_defeated' },
  // "Approach slots, holding patterns, clearances issued to aircraft that came down."
  { boss: 'tower_actual', document: 'Approach Sequence', entry: 'Slot', beat: 'tower_defeated' },
  // "It kept the register of who may cross. Not who did - who *may*."
  { boss: 'registrar', document: 'Crossing Register', entry: 'Entry', beat: 'registrar_defeated' },
  // "Every unit in the city, every hour, against a figure it was given before the end."
  { boss: 'census', document: 'The Count', entry: 'Tally', beat: 'census_defeated' },
  // "Who is assigned where, from when, and until relieved."
  { boss: 'adjutant', document: 'Postings', entry: 'Posting', beat: 'adjutant_defeated' },
  // He held the post because nobody came to relieve him. Orders that stood for thirty-one
  // years are the only document that fits.
  { boss: 'colonel', document: 'Standing Orders', entry: 'Order', beat: 'colonel_defeated' },
]

export function getRecord(boss: string): BossRecord | undefined {
  return BOSS_RECORDS.find((record) => record.boss === boss)
}
