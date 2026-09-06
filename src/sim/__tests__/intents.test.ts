import { describe, it, expect } from 'vitest'
import {
  clearStopReason,
  equip,
  startCombat,
  startSkillAction,
  stopActivity,
  unequip,
} from '../intents'
import { newGame, haltActivity } from '../state'
import { tick } from '../tick'
import { count } from '../bank'

describe('intents are pure', () => {
  it('never mutate the state they are given', () => {
    const state = newGame()
    state.bank['frame_steel'] = 1
    const snapshot = structuredClone(state)

    startSkillAction(state, 'scavenging', 'roadside_wrecks')
    startCombat(state, 'rustbelt')
    stopActivity(state)
    equip(state, 'frame_steel')

    expect(state).toEqual(snapshot)
  })
})

describe('starting activities', () => {
  it('points the mech at a skill action', () => {
    const next = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    expect(next.actors.mech.activity).toEqual({
      kind: 'skill',
      skill: 'scavenging',
      action: 'roadside_wrecks',
    })
  })

  it('switching action abandons progress on the old one', () => {
    // Refining happens at the camp, which is where a new game starts - so this one
    // needs no walk and begins producing straight away.
    let state = startSkillAction(newGame(), 'refining', 'smelt_steel')
    state.bank['scrap_steel'] = 100
    expect(state.actors.mech.travel).toBeNull()

    state = tick(state, 2) // two thirds through a 4s action
    expect(state.actors.mech.progress).toBeGreaterThan(0)

    state = startSkillAction(state, 'fabrication', 'fab_frame_steel')
    expect(state.actors.mech.progress).toBe(0)
  })

  it('walks to an action that is somewhere else before starting it', () => {
    // Scavenging is out in the world, so this one has to travel first.
    let state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    expect(state.actors.mech.at).toBe('the_hollow')
    expect(state.actors.mech.travel).not.toBeNull()

    state = tick(state, 2)
    expect(state.actors.mech.travel).not.toBeNull()
    expect(state.actors.mech.progress).toBe(0) // walking, not working yet

    state = tick(state, 120) // long enough to arrive and then work
    expect(state.actors.mech.at).toBe('roadside')
    expect(state.actors.mech.travel).toBeNull()
    expect(state.bank['scrap_steel']).toBeGreaterThan(0)
  })

  it('cancels a walk when the order changes', () => {
    let state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    expect(state.actors.mech.travel).not.toBeNull()

    state = stopActivity(state)
    expect(state.actors.mech.travel).toBeNull()
    expect(state.actors.mech.activity).toBeNull()
  })

  it('refuses to command a locked actor', () => {
    const state = newGame()
    const next = startSkillAction(state, 'scavenging', 'roadside_wrecks', 'crawler')
    expect(next).toBe(state)
    expect(next.actors.crawler.activity).toBeNull()
  })

  it('redeploying starts a clean engagement', () => {
    let state = startCombat(newGame(), 'rustbelt')
    state = tick(state, 30) // pick a fight and damage something
    expect(state.combat.enemyId).not.toBeNull()

    const redeployed = startCombat(state, 'rustbelt')
    expect(redeployed.combat.enemyId).toBeNull()
    expect(redeployed.combat.attackProgress).toBe(0)
    expect(redeployed.combat.respawnProgress).toBe(0)
  })
})

describe('stopping', () => {
  it('stopping deliberately records no failure reason', () => {
    const state = stopActivity(startSkillAction(newGame(), 'scavenging', 'roadside_wrecks'))
    expect(state.actors.mech.activity).toBeNull()
    expect(state.actors.mech.stoppedReason).toBeNull()
  })

  it('a halt notice can be acknowledged without starting anything', () => {
    const halted = newGame()
    haltActivity(halted, 'mech', 'missing-inputs')

    const cleared = clearStopReason(halted)
    expect(cleared.actors.mech.stoppedReason).toBeNull()
    expect(cleared.actors.mech.activity).toBeNull()

    // Nothing to clear means nothing to copy.
    expect(clearStopReason(cleared)).toBe(cleared)
  })
})

describe('equipping through intents', () => {
  it('returns the original state and a reason when it cannot equip', () => {
    const state = newGame()
    const result = equip(state, 'frame_steel')
    expect(result.state).toBe(state)
    expect(result.error).toBe('not-in-bank')
  })

  it('round trips a part through the chassis and back', () => {
    let state = newGame()
    state.bank['frame_steel'] = 1

    const equipped = equip(state, 'frame_steel')
    expect(equipped.error).toBeNull()
    expect(equipped.state.equipment.frame).toBe('frame_steel')
    expect(count(equipped.state, 'frame_steel')).toBe(0)

    state = unequip(equipped.state, 'frame')
    expect(state.equipment.frame).toBeUndefined()
    expect(count(state, 'frame_steel')).toBe(1)
  })

  it('unequipping an empty slot changes nothing', () => {
    const state = newGame()
    expect(unequip(state, 'weapon')).toBe(state)
  })
})
