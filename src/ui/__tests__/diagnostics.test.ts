import { describe, it, expect } from 'vitest'
import { crashReport, playerReport } from '../diagnostics'
import { deserialize } from '../../sim/save'
import { startSkillAction } from '../../sim/intents'
import { newGame } from '../../sim/state'
import { xpForLevel } from '../../sim/xp'

/**
 * A report is only worth having if it can be loaded.
 *
 * The whole point of the button is that "it broke" arrives with the save it broke in, so
 * the thing to assert is that what comes out the far end still parses - a report whose
 * save half is unusable is a report that only looks like evidence.
 */

const RULE = '--- save below, paste all of it ---'

/** What the person receiving it would do: split on the rule, load the bottom half. */
function saveHalf(report: string): string {
  const at = report.indexOf(RULE)
  expect(at, 'no rule in the report').toBeGreaterThan(-1)
  return report.slice(at + RULE.length).trim()
}

describe('a player report', () => {
  it('carries a save that still loads', () => {
    let state = newGame(7)
    state.skills.scavenging = xpForLevel(20)
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')

    const result = deserialize(saveHalf(playerReport(state, 'own')))
    expect(result.ok, result.ok ? '' : result.error).toBe(true)
    if (!result.ok) return
    expect(result.state.skills.scavenging).toBe(xpForLevel(20))
    expect(result.state.actors.mech.activity?.kind).toBe('skill')
  })

  it('says what was happening before anyone parses anything', () => {
    let state = newGame(7)
    state = startSkillAction(state, 'scavenging', 'roadside_wrecks')
    const report = playerReport(state, 'mid', 'the bar went backwards')

    expect(report).toContain('note: the bar went backwards')
    expect(report).toContain('slot: mid')
    expect(report).toContain('Scavenging / roadside_wrecks')
  })
})

describe('a crash report', () => {
  it('carries the error and whatever was on disk, untouched', () => {
    const broken = '{ this is not json'
    const report = crashReport(new Error('boom'), 'end', broken, '  at Stage\n  at App')

    expect(report).toContain('error: boom')
    expect(report).toContain('slot: end')
    expect(report).toContain('at Stage')
    // Passed through rather than re-serialised. A save that will not parse is precisely
    // the one worth having, and repairing it here would hide the bug being reported.
    expect(saveHalf(report)).toBe(broken)
  })

  it('says so plainly when the slot was empty', () => {
    expect(saveHalf(crashReport(new Error('boom'), 'own', null))).toContain('nothing saved')
  })

  it('survives something thrown that is not an Error', () => {
    // React will hand a boundary whatever was thrown, and code under stress throws
    // strings, nulls and objects. A reporter that crashes while reporting is useless.
    expect(crashReport('just a string', 'own', null)).toContain('error: just a string')
    expect(crashReport(null, 'own', null)).toContain('error: null')
  })
})

/** Kept, so a rename of the marker cannot silently split reports at the wrong place. */
describe('the two halves', () => {
  it('use the same rule', () => {
    expect(playerReport(newGame(1), 'own')).toContain(RULE)
    expect(crashReport(new Error('x'), 'own', null)).toContain(RULE)
  })
})
