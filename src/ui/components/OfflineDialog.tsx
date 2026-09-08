import { getSkill, itemName } from '../../content'
import type { OfflineReport } from '../../sim/offline'
import type { GatheringSkillId, SkillId } from '../../sim/state'
import { formatDuration, formatNumber, formatSigned } from '../format'

const SKILL_LABELS: Record<SkillId, string> = {
  scavenging: 'Scavenging',
  refining: 'Refining',
  fabrication: 'Fabrication',
  salvaging: 'Salvaging',
  attack: 'Attack',
  strength: 'Strength',
  defence: 'Defence',
  hitpoints: 'Hitpoints',
  ranged: 'Ranged',
}

const STOP_TEXT: Record<string, string> = {
  'missing-inputs': 'Work stopped: materials ran out.',
  'level-too-low': 'Work stopped: that action is above your level.',
  'unknown-action': 'Work stopped: that action no longer exists.',
  destroyed: 'You were destroyed and dragged yourself back to standby.',
}

function skillLabel(id: SkillId): string {
  return getSkill(id as GatheringSkillId)?.name ?? SKILL_LABELS[id]
}

export function OfflineDialog({
  report,
  onDismiss,
}: {
  report: OfflineReport
  onDismiss: () => void
}) {
  const skills = Object.entries(report.skillXp) as [SkillId, number][]
  const items = Object.entries(report.items).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
  const nothingHappened = skills.length === 0 && items.length === 0

  return (
    <div className="modal-backdrop" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>While You Were Away</h2>
        <p className="dim">
          You were away for {formatDuration(report.seconds)}.
          {report.awaySeconds !== null && (
            <> Your reactor could only sustain {formatDuration(report.seconds)} of the{' '}
            {formatDuration(report.awaySeconds)} you were gone.</>
          )}
        </p>

        {report.stopped && <p className="warn">{STOP_TEXT[report.stopped.reason] ?? 'Work stopped.'}</p>}

        {report.waiting && (
          <p className="warn">
            {report.waiting.actor === 'crawler' ? 'The crawler is' : 'You are'} still on the
            job but out of {report.waiting.missing.map(itemName).join(' and ')}. The order
            stands - it picks up again the moment there is stock.
          </p>
        )}

        {nothingHappened && <p className="dim">Nothing was running. Nothing changed.</p>}

        {skills.length > 0 && (
          <section>
            <h3>Skills</h3>
            <ul className="tally">
              {skills.map(([skill, xp]) => (
                <li key={skill}>
                  <span>{skillLabel(skill)}</span>
                  <span className="gain">+{formatNumber(xp)} xp</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {items.length > 0 && (
          <section>
            <h3>Items</h3>
            <ul className="tally">
              {items.map(([item, qty]) => (
                <li key={item}>
                  <span>{itemName(item)}</span>
                  <span className={qty > 0 ? 'gain' : 'loss'}>{formatSigned(qty)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button className="primary" onClick={onDismiss} autoFocus>
          Resume
        </button>
      </div>
    </div>
  )
}
