import { useMemo, useState } from 'react'
import { LocalStorageAdapter } from '../platform/SaveAdapter'
import { SKILLS, getSkill } from '../content'
import { getCombatSkill } from '../content/skills/combat'
import {
  COMBAT_SKILLS,
  GATHERING_SKILLS,
  type CombatSkillId,
  type GatheringSkillId,
  type GameState,
} from '../sim/state'
import { combatLevel, derivedStats } from '../sim/stats'
import { levelFromXp, levelProgress } from '../sim/xp'
import { formatNumber } from './format'
import { useGame } from './useGame'
import { Bar } from './components/Bar'
import { SpeedToggle } from './components/SpeedToggle'
import { Toasts, useToasts } from './components/Toast'
import { PixelSprite } from './components/PixelSprite'
import { FIGHT_ICON, SKILL_ICONS } from '../content/sprites'
import { BankPanel } from './components/BankPanel'
import { CombatPanel } from './components/CombatPanel'
import { CombatSkillPanel } from './components/CombatSkillPanel'
import { CrawlerPanel } from './components/CrawlerPanel'
import { MechPanel } from './components/MechPanel'
import { OfflineDialog } from './components/OfflineDialog'
import { LogPanel } from './components/LogPanel'
import { SkillPanel } from './components/SkillPanel'
import { StoryDialog } from './components/StoryDialog'
import { Stage } from './components/Stage'
import { getStoryBeat } from '../content/story'
import { nextInterrupt, unreadLogCount } from '../sim/story'
import { readStoryBeat } from '../sim/intents'

type Tab = GatheringSkillId | CombatSkillId | 'combat' | 'mech' | 'bank' | 'log' | 'crawler'

/** Combat skills are a closed set, so this is how the router tells the two apart. */
function isCombatSkill(tab: Tab): tab is CombatSkillId {
  return (COMBAT_SKILLS as readonly string[]).includes(tab)
}

/** One-line summary of what the mech is doing, for the header. */
function activitySummary(state: GameState): string {
  const activity = state.actors.mech.activity
  if (!activity) return state.actors.crawler.activity ? 'Idle · crawler working' : 'Idle'
  if (activity.kind === 'combat') return 'Fighting'
  const skill = getSkill(activity.skill)
  const action = skill?.actions.find((a) => a.id === activity.action)
  const own = action ? action.name : (skill?.name ?? 'Working')
  return state.actors.crawler.activity ? `${own} · crawler working` : own
}

export function App() {
  // One adapter for the life of the app; swapping this line is the whole desktop port.
  const adapter = useMemo(() => new LocalStorageAdapter(), [])
  const { state, ready, offlineReport, dismissOffline, dispatch, loadError } = useGame(adapter)
  // Scavenging opens first: it is the first thing a new mech can actually do, and with
  // the World tab gone there is no longer a panel whose job is to be looked at.
  const [tab, setTab] = useState<Tab>('scavenging')
  const { toasts, show } = useToasts()

  if (!ready) {
    return (
      <main className="app booting">
        <h1>MECHA IDLE</h1>
        <p className="dim">Reactor spinning up...</p>
      </main>
    )
  }

  const stats = derivedStats(state)
  const interruptId = nextInterrupt(state)
  const interrupt = interruptId ? getStoryBeat(interruptId) : undefined
  const activity = state.actors.mech.activity
  const busy = activity !== null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>MECHA IDLE</h1>
          <span className="dim">{activitySummary(state)}</span>
        </div>
        <div className="topbar-stats">
          <div className="hp">
            <Bar
              value={state.combat.hp > 0 ? state.combat.hp / stats.maxHp : 1}
              tone="hp"
              label="HP"
              detail={`${formatNumber(state.combat.hp > 0 ? state.combat.hp : stats.maxHp)} / ${formatNumber(stats.maxHp)}`}
            />
          </div>
        </div>

        <SpeedToggle
          state={state}
          dispatch={dispatch}
          onNoFuel={() =>
            show('Not enough fuel. Find more by scavenging, or take it off what you kill.')
          }
        />
      </header>

      {loadError && (
        <p className="warn banner">
          {loadError} Your previous save has been left untouched.
        </p>
      )}

      <div className="layout">
        <nav className="rail">
          {/* Combat leads. It is the part of this game with the most in it - zones,
              bosses, four skills of its own - and burying it at the bottom of a list of
              gathering skills said the opposite. */}
          <div className="rail-group">
            <div className="rail-heading dim">Combat</div>
            <button
              className={`rail-item ${tab === 'combat' ? 'selected' : ''}`}
              onClick={() => setTab('combat')}
            >
              <span className="rail-name">
                <PixelSprite layers={[FIGHT_ICON]} scale={1} className="rail-icon" />
                {activity?.kind === 'combat' && <span className="running-dot" aria-label="running" />}
                Fight
              </span>
              <span className="rail-level">{combatLevel(state)}</span>
            </button>
            {COMBAT_SKILLS.map((id) => {
              const xp = state.skills[id]
              return (
                <button
                  key={id}
                  className={`rail-item ${tab === id ? 'selected' : ''}`}
                  onClick={() => setTab(id)}
                >
                  <span className="rail-name">
                    <PixelSprite layers={[SKILL_ICONS[id]]} scale={1} className="rail-icon" />
                    {getCombatSkill(id)?.name ?? id}
                  </span>
                  <span className="rail-level">{levelFromXp(xp)}</span>
                  <Bar value={levelProgress(xp)} tone="xp" />
                </button>
              )
            })}
          </div>

          <div className="rail-group">
            <div className="rail-heading dim">Non-combat</div>
            {GATHERING_SKILLS.map((id) => {
              const skill = SKILLS.find((s) => s.id === id)
              const xp = state.skills[id]
              const running = activity?.kind === 'skill' && activity.skill === id
              return (
                <button
                  key={id}
                  className={`rail-item ${tab === id ? 'selected' : ''}`}
                  onClick={() => setTab(id)}
                >
                  <span className="rail-name">
                    <PixelSprite layers={[SKILL_ICONS[id]]} scale={1} className="rail-icon" />
                    {running && <span className="running-dot" aria-label="running" />}
                    {skill?.name ?? id}
                  </span>
                  <span className="rail-level">{levelFromXp(xp)}</span>
                  <Bar value={levelProgress(xp)} tone="xp" />
                </button>
              )
            })}
          </div>

          <div className="rail-group">
            <div className="rail-heading dim">Character</div>
            <button
              className={`rail-item ${tab === 'mech' ? 'selected' : ''}`}
              onClick={() => setTab('mech')}
            >
              <span className="rail-name">Equipment</span>
            </button>
            <button
              className={`rail-item ${tab === 'crawler' ? 'selected' : ''}`}
              onClick={() => setTab('crawler')}
            >
              <span className="rail-name">
                {state.actors.crawler.activity && (
                  <span className="running-dot" aria-label="working" />
                )}
                Crawler
              </span>
              {!state.actors.crawler.unlocked && <span className="dim">asleep</span>}
            </button>
            <button
              className={`rail-item ${tab === 'bank' ? 'selected' : ''}`}
              onClick={() => setTab('bank')}
            >
              <span className="rail-name">Bank</span>
              <span className="rail-level">{Object.keys(state.bank).length}</span>
            </button>
            <button
              className={`rail-item ${tab === 'log' ? 'selected' : ''}`}
              onClick={() => setTab('log')}
            >
              <span className="rail-name">
                Recovered
                {unreadLogCount(state) > 0 && (
                  <span className="unread-dot" aria-label="unread entries" />
                )}
              </span>
              <span className="rail-level">{state.story.seen.length}</span>
            </button>
          </div>

          {!busy && (
            <p className="rail-hint dim">
              {state.actors.crawler.unlocked
                ? 'You are not doing anything. The crawler works on its own.'
                : 'Nothing is running. Pick an action - you only have attention for one.'}
            </p>
          )}
        </nav>

        <main className="content">
          {tab === 'combat' ? (
            <CombatPanel state={state} dispatch={dispatch} />
          ) : isCombatSkill(tab) ? (
            <CombatSkillPanel state={state} skillId={tab} />
          ) : tab === 'mech' ? (
            <MechPanel state={state} dispatch={dispatch} />
          ) : tab === 'bank' ? (
            <BankPanel state={state} />
          ) : tab === 'crawler' ? (
            <CrawlerPanel state={state} dispatch={dispatch} />
          ) : tab === 'log' ? (
            <LogPanel state={state} dispatch={dispatch} />
          ) : (
            <SkillPanel state={state} skillId={tab} dispatch={dispatch} />
          )}
        </main>

        <Stage state={state} />
      </div>

      <Toasts toasts={toasts} />

      {offlineReport && <OfflineDialog report={offlineReport} onDismiss={dismissOffline} />}

      {/* Story waits behind the offline summary, so returning players read what they
          earned before being told what they remembered. */}
      {!offlineReport && interrupt && (
        <StoryDialog beat={interrupt} onDismiss={() => dispatch((s) => readStoryBeat(s, interrupt.id))} />
      )}
    </div>
  )
}
