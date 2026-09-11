import { describe, it, expect } from 'vitest'
import { ENEMIES, getEnemy } from '../../content'
import { dossier, phaseEffects, verdict } from '../dossier'

/**
 * The dossier is a promise about a fight, read before it. A promise that disagrees with
 * the fight is worse than none, so these check it against the content it came from.
 */

const bosses = ENEMIES.filter((e) => e.isBoss)

describe('every boss has a dossier', () => {
  it('covers the whole fight: the opening, then one step per phase', () => {
    expect(bosses.length).toBeGreaterThan(0)
    for (const boss of bosses) {
      const steps = dossier(boss)
      expect(steps[0]!.at, `${boss.id} does not start at the opening`).toBe('Opens')
      expect(steps.length, `${boss.id} is missing phases`).toBe((boss.phases?.length ?? 0) + 1)
      // Every boss is a phased fight. A boss whose dossier had nothing after "Opens" would
      // be telling the player to prepare for a fight with no turns in it.
      expect(steps.length, `${boss.id} has no phases to prepare for`).toBeGreaterThan(1)
    }
  })

  it('lists phases in the order they arrive', () => {
    for (const boss of bosses) {
      const thresholds = dossier(boss)
        .slice(1)
        .map((s) => Number(s.at.replace(/\D/g, '')))
      expect(thresholds, `${boss.id} is out of order`).toEqual([...thresholds].sort((a, b) => b - a))
    }
  })

  it('says something about every phase', () => {
    // A phase with no effects and unchanged resistances would be a name with nothing to
    // prepare for. Each one has to change *something* the player can read.
    for (const boss of bosses) {
      const [opening, ...phases] = dossier(boss)
      for (const step of phases) {
        const changesResistance = JSON.stringify(step.resistances) !== JSON.stringify(opening!.resistances)
        expect(
          step.effects.length > 0 || changesResistance,
          `${boss.id} / ${step.name} changes nothing a player could see coming`,
        ).toBe(true)
      }
    }
  })
})

describe('phase effects read as the player feels them', () => {
  it('reports attack speed as a rate, not an interval', () => {
    // An interval of 0.6 is 1/0.6 = 1.67 swings for every one before - "67% faster".
    expect(phaseEffects({ below: 0.5, name: 'x', message: '', attackIntervalMultiplier: 0.6 }, 'kinetic'))
      .toContain('attacks 67% faster')
    expect(phaseEffects({ below: 0.5, name: 'x', message: '', attackIntervalMultiplier: 1.15 }, 'kinetic'))
      .toContain('attacks 13% slower')
  })

  it('names a change of damage type only when it is one', () => {
    const same = phaseEffects({ below: 0.5, name: 'x', message: '', damageType: 'kinetic' }, 'kinetic')
    const moved = phaseEffects({ below: 0.5, name: 'x', message: '', damageType: 'energy' }, 'kinetic')
    expect(same.join()).not.toContain('switches')
    expect(moved).toContain('switches to energy attacks')
  })

  it('flags the evasion extremes, since those are the phases that ask a different question', () => {
    expect(phaseEffects({ below: 0.5, name: 'x', message: '', evasionMultiplier: 2.6 }, 'kinetic').join())
      .toContain('hard to land hits')
    expect(phaseEffects({ below: 0.5, name: 'x', message: '', evasionMultiplier: 0.3 }, 'kinetic').join())
      .toContain('wide open')
  })
})

describe('the verdict', () => {
  it('only speaks when the weapon is clearly wrong or clearly right', () => {
    expect(verdict({ kinetic: 0.25 }, 'kinetic')?.tone).toBe('bad')
    expect(verdict({ emp: 1.5 }, 'emp')?.tone).toBe('good')
    expect(verdict({ kinetic: 0.9 }, 'kinetic')).toBeNull()
    expect(verdict({}, 'energy')).toBeNull()
  })

  it('tells the Overseer story the design says it should', () => {
    // Opens neutral, then Bulwark walls kinetic and opens EMP. The dossier has to show a
    // kinetic player being walled and an EMP player being rewarded in that phase.
    const overseer = getEnemy('overseer')!
    const bulwark = dossier(overseer).find((s) => s.name === 'Bulwark')!
    expect(verdict(bulwark.resistances, 'kinetic')?.tone).toBe('bad')
    expect(verdict(bulwark.resistances, 'emp')?.tone).toBe('good')
  })
})
