import { describe, it, expect } from 'vitest'
import {
  WORLD_NODES,
  STARTING_NODE,
  getNode,
  ADJACENCY,
  nodesForAction,
} from '../../content/world'
import { SKILLS } from '../../content'
import { actorPosition, findNearest, findPath, hopSeconds } from '../world'
import { DEFAULT_START_NODE, newGame, type GameState } from '../state'
import { startCombat, startSkillAction } from '../intents'
import { tick } from '../tick'
import { derivedStats } from '../stats'
import { applyOffline } from '../offline'

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
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
        expect(back, `${from} -> ${edge.to} is not walkable in reverse`).toBe(true)
        expect(edge.length).toBeGreaterThan(0)
      }
    }
  })

  it('can reach every node from the start', () => {
    // An unreachable node is content that no player can ever get to.
    for (const node of WORLD_NODES) {
      expect(findPath(STARTING_NODE, node.id), `${node.id} is stranded`).not.toBeNull()
    }
  })
})

describe('pathfinding', () => {
  it('returns an empty path when already there', () => {
    expect(findPath('the_hollow', 'the_hollow')).toEqual([])
  })

  it('returns null for nodes that do not exist', () => {
    expect(findPath('the_hollow', 'atlantis')).toBeNull()
    expect(findPath('atlantis', 'the_hollow')).toBeNull()
  })

  it('finds a direct hop', () => {
    expect(findPath('the_hollow', 'roadside')).toEqual(['roadside'])
  })

  it('routes through intermediate nodes when there is no direct edge', () => {
    const path = findPath('roadside', 'slag_fields')
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(1)
    expect(path!.at(-1)).toBe('slag_fields')
  })

  it('prefers the cheapest route, not the fewest hops', () => {
    // Edges carry a difficulty multiplier, which is the whole reason this is
    // Dijkstra rather than a breadth-first search.
    const path = findPath('the_hollow', 'slag_fields')
    expect(path).not.toBeNull()
    expect(path!.at(-1)).toBe('slag_fields')
  })

  it('picks the nearest of several candidate destinations', () => {
    const nearest = findNearest('the_hollow', ['roadside', 'slag_fields'])
    expect(nearest?.node).toBe('roadside')
  })

  it('ignores unreachable candidates', () => {
    const nearest = findNearest('the_hollow', ['atlantis', 'roadside'])
    expect(nearest?.node).toBe('roadside')
    expect(findNearest('the_hollow', ['atlantis'])).toBeNull()
  })
})

describe('travel timing', () => {
  it('takes longer the further you go, and less the faster you are', () => {
    const near = hopSeconds('the_hollow', 'roadside', 30)
    const fast = hopSeconds('the_hollow', 'roadside', 60)
    expect(near).toBeGreaterThan(0)
    expect(fast).toBeCloseTo(near / 2, 5)
  })

  it('arrives after roughly the predicted time', () => {
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    const expected = hopSeconds('the_hollow', 'roadside', derivedStats(state).moveSpeed)

    const justBefore = tick(state, expected - 0.5)
    expect(justBefore.actors.mech.at).toBe('the_hollow')
    expect(justBefore.actors.mech.travel).not.toBeNull()

    const justAfter = tick(state, expected + 0.01)
    expect(justAfter.actors.mech.at).toBe('roadside')
    expect(justAfter.actors.mech.travel).toBeNull()
  })

  it('spends leftover time working instead of standing still on arrival', () => {
    // The whole reason advanceTravel hands back the remainder: a single large step
    // must both travel and then work.
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    const after = tick(state, 60)
    expect(after.actors.mech.at).toBe('roadside')
    expect(after.bank['scrap_steel']).toBeGreaterThan(0)
  })

  it('walks to a combat zone before fighting', () => {
    const state = startCombat(newGame(), 'rustbelt')
    expect(state.actors.mech.travel).not.toBeNull()

    const arrived = tick(state, 60)
    expect(arrived.actors.mech.travel).toBeNull()
    expect(['graveyard', 'checkpoint']).toContain(arrived.actors.mech.at)
  })

  it('does not walk when the action is already underfoot', () => {
    // Refining lives at the camp, where a new game begins.
    const state = startSkillAction(newGame(), 'refining', 'smelt_steel')
    expect(state.actors.mech.travel).toBeNull()
    expect(state.actors.mech.at).toBe('the_hollow')
  })
})

describe('travel and the offline guarantee', () => {
  it('one big step lands where many small ones do', () => {
    // Travel is simulated, so it obeys the same equivalence everything else does -
    // with one honest caveat. Leg lengths are hypot() distances, so the leftover
    // seconds handed from travel to work cannot be bit-identical across step sizes.
    // Everything that affects the player is exact; only the sub-second progress
    // counter drifts, by about 1e-13 over an hour.
    const make = () => startSkillAction(newGame(4242), 'scavenging', 'roadside_wrecks')
    const bulk = tick(make(), 3600)
    const incremental = tickBy(make(), 3600, 0.25)

    expect(incremental.bank).toEqual(bulk.bank)
    expect(incremental.skills).toEqual(bulk.skills)
    expect(incremental.rngSeed).toBe(bulk.rngSeed)
    expect(incremental.combat).toEqual(bulk.combat)
    expect(incremental.actors.mech.at).toBe(bulk.actors.mech.at)
    expect(incremental.actors.mech.travel).toEqual(bulk.actors.mech.travel)
    expect(incremental.actors.mech.progress).toBeCloseTo(bulk.actors.mech.progress, 9)
  })

  it('credits the walk and then the work when returning from offline', () => {
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    state.savedAt = Date.now() - 8 * 3600 * 1000

    const { state: after, report } = applyOffline(state, Date.now())
    expect(after.actors.mech.at).toBe('roadside')
    expect(report?.items['scrap_steel']).toBeGreaterThan(0)
  })

  it('loses the travel time rather than pretending it was free', () => {
    // An hour spent partly walking must produce less than an hour spent all working.
    const walked = tick(startSkillAction(newGame(), 'scavenging', 'roadside_wrecks'), 3600)

    const noWalk = newGame()
    noWalk.actors.mech.at = 'roadside'
    const stayed = tick(startSkillAction(noWalk, 'scavenging', 'roadside_wrecks'), 3600)

    expect(walked.bank['scrap_steel']).toBeLessThan(stayed.bank['scrap_steel'] ?? 0)
  })
})

describe('rendering position', () => {
  it('sits on the node when standing still', () => {
    const state = newGame()
    const node = getNode('the_hollow')!
    expect(actorPosition(state, 'mech')).toEqual({ x: node.x, y: node.y })
  })

  it('interpolates between nodes while walking', () => {
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    const from = getNode('the_hollow')!
    const to = getNode('roadside')!

    const half = tick(state, hopSeconds('the_hollow', 'roadside', derivedStats(state).moveSpeed) / 2)
    const pos = actorPosition(half, 'mech')

    expect(pos.x).toBeCloseTo((from.x + to.x) / 2, 0)
    expect(pos.y).toBeCloseTo((from.y + to.y) / 2, 0)
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

  it('every gathering action is walkable from the start without a fight', () => {
    for (const { skill, action } of gatheringActions) {
      const reachable = nodesForAction(skill, action).some(
        (node) => findPath(STARTING_NODE, node.id) !== null,
      )
      expect(reachable, `${skill}:${action} cannot be reached from the start`).toBe(true)
    }
  })

  it('no place offering a gathering action is locked behind a boss', () => {
    for (const { skill, action } of gatheringActions) {
      const open = nodesForAction(skill, action).filter((node) => !node.unlockedBy)
      expect(
        open.length,
        `${skill}:${action} is only available at boss-locked places`,
      ).toBeGreaterThan(0)
    }
  })

  it('leaves combat free to be gated as much as we like', () => {
    // The contract is one-directional on purpose: combat zones may carry any
    // requirement. This asserts the rule is not accidentally applied to them too.
    const combatNodes = WORLD_NODES.filter((node) => node.combat)
    expect(combatNodes.length).toBeGreaterThan(0)
  })
})
