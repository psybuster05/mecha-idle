import { describe, it, expect } from 'vitest'
import { STORY_BEATS, getStoryBeat } from '../../content/story'
import { SKILLS } from '../../content'
import { ENEMIES, getEnemy } from '../../content/enemies'
import { getNode, WORLD_NODES } from '../../content/world'
import { ALL_SKILLS, newGame, recordDefeat, type GameState } from '../state'
import { advanceStory, nextInterrupt, unreadLogCount } from '../story'
import { readAllStoryBeats, readStoryBeat, startCombat, startSkillAction } from '../intents'
import { applyOffline } from '../offline'
import { tick } from '../tick'
import { deserialize, serialize } from '../save'

function tickBy(state: GameState, total: number, step: number): GameState {
  let next = state
  for (let t = 0; t < Math.round(total / step); t++) next = tick(next, step)
  return next
}

describe('story content integrity', () => {
  it('has no duplicate beat ids', () => {
    const ids = STORY_BEATS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only triggers on things that exist', () => {
    for (const beat of STORY_BEATS) {
      const when = beat.when
      if (when.kind === 'defeat') {
        expect(getEnemy(when.boss), `${beat.id} waits on unknown boss`).toBeDefined()
        expect(getEnemy(when.boss)?.isBoss, `${beat.id} waits on a non-boss`).toBe(true)
      }
      if (when.kind === 'visit') {
        expect(getNode(when.node), `${beat.id} waits on unknown place`).toBeDefined()
      }
      if (when.kind === 'skillLevel') {
        expect(ALL_SKILLS, `${beat.id} waits on unknown skill`).toContain(when.skill)
        expect(when.level).toBeGreaterThan(1)
        expect(when.level).toBeLessThanOrEqual(99)
      }
      if (when.kind === 'allDefeated') {
        for (const boss of when.bosses) expect(getEnemy(boss)).toBeDefined()
      }
    }
  })

  it('rations interrupts', () => {
    // Only the waking, the bosses and the ending should ever stop play.
    const interrupts = STORY_BEATS.filter((b) => b.kind === 'interrupt')
    expect(interrupts.length).toBeLessThanOrEqual(10)
    for (const beat of interrupts) {
      expect(
        ['gameStart', 'defeat', 'allDefeated'],
        `${beat.id} interrupts on something minor`,
      ).toContain(beat.when.kind)
    }
  })

  it('gives every beat something to say', () => {
    for (const beat of STORY_BEATS) {
      expect(beat.title.length, beat.id).toBeGreaterThan(0)
      expect(beat.body.length, beat.id).toBeGreaterThan(0)
      for (const line of beat.body) expect(line.trim().length, beat.id).toBeGreaterThan(0)
    }
  })
})

describe('triggering', () => {
  it('fires the waking immediately', () => {
    const state = newGame()
    advanceStory(state)
    expect(state.story.pending).toContain('awakening')
    expect(nextInterrupt(state)).toBe('awakening')
  })

  it('fires a beat when its boss falls, and not before', () => {
    const state = newGame()
    advanceStory(state)
    expect(state.story.pending).not.toContain('overseer_defeated')

    recordDefeat(state, 'overseer')
    advanceStory(state)
    expect(state.story.pending).toContain('overseer_defeated')
  })

  it('never fires the same beat twice', () => {
    const state = newGame()
    advanceStory(state)
    const first = [...state.story.pending]

    advanceStory(state)
    expect(state.story.pending).toEqual(first)

    const read = readStoryBeat(state, 'awakening')
    advanceStory(read)
    expect(read.story.pending).not.toContain('awakening')
    expect(read.story.seen).toContain('awakening')
  })
})

/**
 * Why visits are recorded on arrival rather than read from where the mech stands.
 *
 * "Currently at X" is not monotonic: one large offline step can walk you through
 * somewhere and out the far side, and a beat keyed on the visit would never fire.
 */
describe('triggers are monotonic', () => {
  it('records a place on arrival, and keeps it after leaving', () => {
    let state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    state = tickBy(state, 60, 0.5)
    expect(state.visited).toContain('roadside')

    state = startSkillAction(state, 'refining', 'smelt_steel')
    state = tickBy(state, 120, 0.5)
    expect(state.actors.mech.at).toBe('the_hollow')
    expect(state.visited).toContain('roadside')
  })

  it('catches the same beats in one big step as in many small ones', () => {
    const bulk = tick(startSkillAction(newGame(), 'scavenging', 'reactor_slag'), 3600)
    const incremental = tickBy(
      startSkillAction(newGame(), 'scavenging', 'reactor_slag'),
      3600,
      0.5,
    )
    expect([...bulk.visited].sort()).toEqual([...incremental.visited].sort())
    expect(bulk.story.pending).toEqual(incremental.story.pending)
  })
})

describe('story survives being away', () => {
  it('is waiting when you come back', () => {
    const state = startSkillAction(newGame(), 'scavenging', 'roadside_wrecks')
    state.savedAt = Date.now() - 8 * 3600 * 1000
    state.story.seen = ['awakening']

    const { state: after } = applyOffline(state, Date.now())
    expect(after.story.pending).toContain('first_scrap')
  })

  it('round trips through a save', () => {
    const state = newGame()
    advanceStory(state)
    const result = deserialize(serialize(state, Date.now()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.story.pending).toEqual(state.story.pending)
    expect(result.state.visited).toEqual(state.visited)
  })

  it('is filled in for saves written before it existed', () => {
    const old = { ...newGame() } as Record<string, unknown>
    delete old['story']
    delete old['visited']
    const result = deserialize(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.story).toEqual({ pending: [], seen: [] })
    expect(result.state.visited.length).toBeGreaterThan(0)
  })
})

describe('reading', () => {
  it('counts only quiet beats toward the badge', () => {
    const state = newGame()
    recordDefeat(state, 'overseer')
    advanceStory(state)

    const logs = state.story.pending.filter((id) => getStoryBeat(id)?.kind === 'log')
    expect(unreadLogCount(state)).toBe(logs.length)
    expect(state.story.pending).toContain('overseer_defeated')
  })

  it('opening the log clears the quiet ones and leaves interrupts alone', () => {
    let state = newGame()
    state.skills.scavenging = 2000
    recordDefeat(state, 'overseer')
    advanceStory(state)

    const logs = state.story.pending.filter((id) => getStoryBeat(id)?.kind === 'log')
    state = readAllStoryBeats(state, logs)

    expect(unreadLogCount(state)).toBe(0)
    // The interrupt still has to be acknowledged on its own terms.
    expect(nextInterrupt(state)).not.toBeNull()
  })
})

/** Story reads from the world; the world never reads from story. */
describe('story gates nothing', () => {
  it('leaves progress untouched however much is unread', () => {
    const ignored = tickBy(
      startSkillAction(newGame(), 'scavenging', 'roadside_wrecks'),
      3600,
      0.5,
    )
    const read = tickBy(
      readAllStoryBeats(startSkillAction(newGame(), 'scavenging', 'roadside_wrecks'), [
        'awakening',
      ]),
      3600,
      0.5,
    )
    expect(ignored.bank).toEqual(read.bank)
    expect(ignored.skills).toEqual(read.skills)
  })
})

/**
 * The mirror of "story gates nothing".
 *
 * That rule says skipping every word must leave the game playable. This is the other
 * direction: **playing normally must not skip the story.** Nine beats trigger on
 * visiting a place, and nothing in the game requires you to stand anywhere - starting an
 * action moves you to the *first* open node that offers it, so a beat keyed on a node
 * that is merely an alternate door to the same work would never fire for most players.
 *
 * This walks every action and every combat zone, records where each one actually puts
 * the mech, and asserts that covers every visit trigger. It is what says the World
 * panel's place list is optional rather than load-bearing.
 */
describe('story is not missable by playing normally', () => {
  it('reaches every visit-triggered beat without visiting anywhere on purpose', () => {
    const champion = () => {
      const state = newGame()
      for (const enemy of ENEMIES) if (enemy.isBoss) recordDefeat(state, enemy.id)
      return state
    }

    const reached = new Set<string>()
    for (const skill of SKILLS) {
      for (const action of skill.actions) {
        const state = champion()
        state.skills[skill.id] = Number.MAX_SAFE_INTEGER
        reached.add(startSkillAction(state, skill.id, action.id).actors.mech.at)
      }
    }
    for (const zone of new Set(WORLD_NODES.map((n) => n.combat).filter(Boolean))) {
      reached.add(startCombat(champion(), zone!).actors.mech.at)
    }

    for (const beat of STORY_BEATS) {
      if (beat.when.kind !== 'visit') continue
      expect(
        reached.has(beat.when.node),
        `"${beat.id}" only fires if the player goes to ${beat.when.node} deliberately`,
      ).toBe(true)
    }
  })
})
