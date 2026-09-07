import { useMemo, useState } from 'react'
import { LocalStorageAdapter } from '../platform/SaveAdapter'
import { SKILLS, getSkill } from '../content'
import { GATHERING_SKILLS, type GatheringSkillId, type GameState } from '../sim/state'
import { combatLevel, derivedStats } from '../sim/stats'
import { levelFromXp, levelProgress } from '../sim/xp'
import { formatNumber } from './format'
import { useGame } from './useGame'
import { Bar } from './components/Bar'
import { BankPanel } from './components/BankPanel'
import { CombatPanel } from './components/CombatPanel'
import { MechPanel } from './components/MechPanel'
import { OfflineDialog } from './components/OfflineDialog'
import { LogPanel } from './components/LogPanel'
import { SkillPanel } from './components/SkillPanel'
import { StoryDialog } from './components/StoryDialog'
import { WorldPanel } from './components/WorldPanel'
import { getStoryBeat } from '../content/story'
import { nextInterrupt, unreadLogCount } from '../sim/story'
import { readStoryBeat } from '../sim/intents'

type Tab = GatheringSkillId | 'world' | 'combat' | 'mech' | 'bank' | 'log'

/** One-line summary of what the mech is doing, for the header. */
function activitySummary(state: GameState): string {
  if (state.actors.mech.travel) return 'Travelling'
  const activity = state.actors.mech.activity
  if (!activity) return 'Idle'
  if (activity.kind === 'combat') return 'Fighting'
  const skill = getSkill(activity.skill)
  const action = skill?.actions.find((a) => a.id === activity.action)
  return action ? action.name : skill?.name ?? 'Working'
}

export function App() {
  // One adapter for the life of the app; swapping this line is the whole desktop port.
  const adapter = useMemo(() => new LocalStorageAdapter(), [])
  const { state, live, ready, offlineReport, dismissOffline, dispatch, loadError } = useGame(adapter)
  // The world opens first: the walking sprite is the thing that makes this feel like
  // a place rather than a spreadsheet.
  const [tab, setTab] = useState<Tab>('world')

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
      </header>

      {loadError && (
        <p className="warn banner">
          {loadError} Your previous save has been left untouched.
        </p>
      )}

      <div className="layout">
        <nav className="rail">
          <div className="rail-group">
            <button
              className={`rail-item ${tab === 'world' ? 'selected' : ''}`}
              onClick={() => setTab('world')}
            >
              <span className="rail-name">
                {state.actors.mech.travel && <span className="running-dot" aria-label="travelling" />}
                World
              </span>
            </button>
          </div>

          <div className="rail-group">
            <div className="rail-heading dim">Skills</div>
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
                    {running && <span className="running-dot" aria-label="running" />}
                    {skill?.name ?? id}
                  </span>
                  <span className="rail-level">{levelFromXp(xp)}</span>
                  <Bar value={levelProgress(xp)} tone="xp" />
                </button>
              )
            })}
            <button
              className={`rail-item ${tab === 'combat' ? 'selected' : ''}`}
              onClick={() => setTab('combat')}
            >
              <span className="rail-name">
                {activity?.kind === 'combat' && <span className="running-dot" aria-label="running" />}
                Combat
              </span>
              <span className="rail-level">{combatLevel(state)}</span>
            </button>
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
              Nothing is running. Pick an action - you only have attention for one.
            </p>
          )}
        </nav>

        <main className="content">
          {tab === 'world' ? (
            <WorldPanel state={state} live={live} dispatch={dispatch} />
          ) : tab === 'combat' ? (
            <CombatPanel state={state} dispatch={dispatch} />
          ) : tab === 'mech' ? (
            <MechPanel state={state} dispatch={dispatch} />
          ) : tab === 'bank' ? (
            <BankPanel state={state} />
          ) : tab === 'log' ? (
            <LogPanel state={state} dispatch={dispatch} />
          ) : (
            <SkillPanel state={state} skillId={tab} dispatch={dispatch} />
          )}
        </main>
      </div>

      {offlineReport && <OfflineDialog report={offlineReport} onDismiss={dismissOffline} />}

      {/* Story waits behind the offline summary, so returning players read what they
          earned before being told what they remembered. */}
      {!offlineReport && interrupt && (
        <StoryDialog beat={interrupt} onDismiss={() => dispatch((s) => readStoryBeat(s, interrupt.id))} />
      )}
    </div>
  )
}
