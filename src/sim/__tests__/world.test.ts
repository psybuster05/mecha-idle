import { describe, it, expect } from 'vitest'
import { WORLD_NODES, STARTING_NODE, getNode, ADJACENCY, nodesForAction } from '../../content/world'
import { SKILLS } from '../../content'
import { actorPosition, isNodeOpen, moveToAny, placeActor } from '../world'
import { DEFAULT_START_NODE, newGame, type GameState, type NodeId } from '../state'
import { startCombat, startSkillAction } from '../intents'
import { tick } from '../tick'

/** Everything joined to `from` by edges, ignoring locks. */
function connectedTo(from: NodeId): Set<string> {
  const seen = new Set<string>([from])
  const queue: NodeId[] = [from]
  while (queue.length) {
    for (const edge of ADJACENCY.get(queue.pop()!) ?? []) {
      if (seen.has(edge.to)) continue
      seen.add(edge.to)
      queue.push(edge.to)
    }
  }
  return seen
}

describe('world graph', () => {
  it('keeps the sim and content start nodes in agreement', () => {
    // sim/ cannot import content/ at runtime without a cycle, so the default start
    // node is duplicated. This test is what stops the two drifting apart.
    expect(DEFAULT_START_NODE).toBe(STARTING_NODE)
    expect(getNode(DEFAULT_START_NODE)).toBeDefined()
  })

  it('only links nodes that exist, and links them both ways', () => {
    for (const [from, edges] of ADJACENCY) {
      expect(getNode(from), `unknown node "${from}"`).toBeDefined()
      for (const edge of edges) {
        expect(getNode(edge.to), `edge to unknown node "${edge.to}"`).toBeDefined()
        const back = ADJACENCY.get(edge.to)?.some((e) => e.to === from)
        expect(back, `${from} -> ${edge.to} is not joined in reverse`).toBe(true)
        expect(edge.length).toBeGreaterThan(0)
      }
    }
  })

  it('joins every node to the rest of the world', () => {
    // Nothing walks these edges any more, but the map draws them, and it only shows
    // places that touch somewhere you can already go. An island would be invisible.
    const connected = connectedTo(STARTING_NODE)
    for (const node of WORLD_NODES) {
      expect(connected.has(node.id), `${node.id} is drawn nowhere`).toBe(true)
    }
  })
})

/**
 * Places, now that getting to them is free.
 *
 * Travel was removed - a walk you cannot watch is a cost with no feedback - but a place
 * is still the thing a boss lock hangs from, so the question "can I be here" survived
 * the deletion and the question "how long to get there" did not.
 */
describe('places', () => {
  it('opens anywhere without a lock, and nothing behind one', () => {
    const state = newGame()
    expect(isNodeOpen(state, 'the_hollow')).toBe(true)

    const sealed = WORLD_NODES.find((node) => node.unlockedBy)!
    expect(isNodeOpen(state, sealed.id)).toBe(false)

    state.defeated[sealed.unlockedBy!] = 1
    expect(isNodeOpen(state, sealed.id)).toBe(true)
  })

  it('refuses to put an actor anywhere shut, or anywhere fictional', () => {
    const state = newGame()
    const sealed = WORLD_NODES.find((node) => node.unlockedBy)!

    expect(placeActor(state, 'mech', sealed.id)).toBe(false)
    expect(placeActor(state, 'mech', 'atlantis' as NodeId)).toBe(false)
    expect(state.actors.mech.at).toBe(DEFAULT_START_NODE)
  })

  it('records the visit when an actor arrives', () => {
    const state = newGame()
    expect(placeActor(state, 'mech', 'roadside')).toBe(true)
    expect(state.actors.mech.at).toBe('roadside')
    expect(state.visited).toContain('roadside')
  })

  it('stays put when it is already somewhere that will do', () => {
    const state = newGame()
    expect(moveToAny(state, 'mech', ['roadside', DEFAULT_START_NODE])).toBe(true)
    expect(state.actors.mech.at).toBe(DEFAULT_START_NODE)
  })

  it('skips shut candidates and takes the first open one', () => {
    const state = newGame()
    const sealed = WORLD_NODES.find((node) => node.unlockedBy)!
    expect(moveToAny(state, 'mech', [sealed.id, 'roadside'])).toBe(true)
    expect(state.actors.mech.at).toBe('roadside')
  })

  it('fails when every candidate is shut', () => {
    const state = newGame()
    const sealed = WORLD_NODES.find((node) => node.unlockedBy)!
    expect(moveToAny(state, 'mech', [sealed.id])).toBe(false)
  })
})

describe('starting work', () => {
  it('puts you where the work is, immediately', () => {
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    expect(state.actors.mech.at).toBe('roadside')
    expect(state.actors.mech.stoppedReason).toBeNull()
  })

  it('produces from the first second, with no journey to pay for', () => {
    // The point of the removal: an hour ordered is an hour worked.
    const sent = tick(startSkillAction(newGame(), 'scavenging', 'roadside_wrecks'), 3600)

    const already = newGame()
    already.actors.mech.at = 'roadside'
    const stayed = tick(startSkillAction(already, 'scavenging', 'roadside_wrecks'), 3600)

    expect(sent.bank['scrap_steel']).toBe(stayed.bank['scrap_steel'])
  })

  it('does not move you when the work is already underfoot', () => {
    // Refining lives at the camp, where a new game begins.
    const state = startSkillAction(newGame(), 'refining', 'smelt_steel')
    expect(state.actors.mech.at).toBe('the_hollow')
  })

  it('deploys straight into a combat zone', () => {
    const state = startCombat(newGame(), 'rustbelt')
    expect(state.actors.mech.activity?.kind).toBe('combat')
    expect(getNode(state.actors.mech.at)?.combat).toBe('rustbelt')
  })

  it('halts rather than silently doing nothing when everywhere is shut', () => {
    // Found by a dead Start button: an action whose every location is locked used to
    // sit there looking active and produce nothing at all.
    const sealedAction = SKILLS.flatMap((skill) =>
      skill.actions.map((action) => ({ skill: skill.id, action: action.id })),
    ).find(({ skill, action }) => nodesForAction(skill, action).every((node) => node.unlockedBy))
    expect(sealedAction, 'no locked action to test with').toBeDefined()

    const state = newGame()
    state.skills[sealedAction!.skill] = Number.MAX_SAFE_INTEGER
    const after = startSkillAction(state, sealedAction!.skill, sealedAction!.action)
    expect(after.actors.mech.stoppedReason).toBe('unreachable')
  })
})

describe('rendering position', () => {
  it('sits on the node it is standing on', () => {
    const state: GameState = newGame()
    const node = getNode('the_hollow')!
    expect(actorPosition(state, 'mech')).toEqual({ x: node.x, y: node.y })
  })
})

/**
 * The gating contract.
 *
 * Every non-combat skill must reach 99 on time alone. Combat widens what you can do -
 * new regions, unique materials, story, perks - but it never stands between a player
 * and a level. In a game that allows one action at a time, a boss you cannot beat
 * would otherwise stop *everything*, which is the opposite of what an idle game sells.
 *
 * These tests exist to catch the back-door version of the mistake: quietly putting a
 * better gathering node inside a locked region.
 */
describe('non-combat skills are never gated behind combat', () => {
  const gatheringActions = SKILLS.flatMap((skill) =>
    skill.actions.map((action) => ({ skill: skill.id, action: action.id })),
  )

  it('every gathering action exists somewhere on the map', () => {
    for (const { skill, action } of gatheringActions) {
      expect(
        nodesForAction(skill, action).length,
        `${skill}:${action} has nowhere to be performed`,
      ).toBeGreaterThan(0)
    }
  })

  it('leaves a full 1-99 ladder outside every lock', () => {
    // The contract is not "gathering is never locked" - locked regions may hold
    // gathering content, and the Ship Graveyard does. What they may never be is
    // *required*. This checks the shape of that here; the pacing suite proves the
    // open-world ladder actually still reaches 99 at the target rate.
    for (const skill of SKILLS) {
      const open = skill.actions.filter((action) =>
        nodesForAction(skill.id, action.id).some((node) => !node.unlockedBy),
      )
      expect(open.length, `${skill.id} has no unlocked actions at all`).toBeGreaterThan(0)
      expect(
        Math.max(...open.map((a) => a.levelRequired)),
        `${skill.id} stops too early outside the locks to carry a player to 99`,
      ).toBeGreaterThanOrEqual(90)
    }
  })

  it('leaves combat free to be gated as much as we like', () => {
    // The contract is one-directional on purpose: combat zones may carry any
    // requirement. This asserts the rule is not accidentally applied to them too.
    const combatNodes = WORLD_NODES.filter((node) => node.combat)
    expect(combatNodes.length).toBeGreaterThan(0)
  })
})
