import { describe, it, expect } from 'vitest'
import { ENEMIES } from '../enemies'
import { BOSS_RECORDS, getRecord } from '../records'
import { STORY_BEATS } from '../story'

/**
 * A record joins three tables - enemies, story and itself - so these check the joins.
 * A broken one fails silently in the UI: a boss with no record just shows no document,
 * and a record naming a beat that does not exist would open onto nothing on defeat.
 */

const bosses = ENEMIES.filter((e) => e.isBoss)

describe('boss records', () => {
  it('gives every boss exactly one record', () => {
    for (const boss of bosses) {
      const records = BOSS_RECORDS.filter((r) => r.boss === boss.id)
      expect(records.length, `${boss.id} has ${records.length} records`).toBe(1)
    }
  })

  it('only names real bosses', () => {
    for (const record of BOSS_RECORDS) {
      expect(bosses.some((b) => b.id === record.boss), `${record.boss} is not a boss`).toBe(true)
    }
  })

  it('seals the beat that boss actually opens on defeat', () => {
    // The sealed entry has to be *that* boss's defeat beat. Pointing at another boss's
    // would reveal the wrong part of the story at the wrong fight.
    for (const record of BOSS_RECORDS) {
      const beat = STORY_BEATS.find((b) => b.id === record.beat)
      expect(beat, `${record.boss} seals ${record.beat}, which does not exist`).toBeDefined()
      expect(beat!.when).toEqual({ kind: 'defeat', boss: record.boss })
    }
  })

  it('leaves no boss defeat beat outside a record', () => {
    // Every beat a boss fight opens belongs in that boss's record, or the record is
    // missing the one line it exists to guard.
    const defeatBeats = STORY_BEATS.filter((b) => b.when.kind === 'defeat')
    for (const beat of defeatBeats) {
      expect(BOSS_RECORDS.some((r) => r.beat === beat.id), `${beat.id} is in no record`).toBe(true)
    }
  })

  it('names a document and an entry for each', () => {
    for (const boss of bosses) {
      const record = getRecord(boss.id)!
      expect(record.document.trim().length).toBeGreaterThan(0)
      expect(record.entry.trim().length).toBeGreaterThan(0)
    }
  })
})
