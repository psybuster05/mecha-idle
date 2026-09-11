import { useState } from 'react'
import { playerReport, copyToClipboard } from '../diagnostics'
import { ReportDialog } from './ReportDialog'
import { BUILD } from '../build'
import type { GameState } from '../../sim/state'
import type { SlotId } from '../../platform/SaveAdapter'

/** The repo is public, so this is the address that does not put anyone's inbox on a page. */
const ISSUES = 'https://github.com/psybuster05/mecha-idle/issues/new'

/**
 * How a tester says what happened.
 *
 * Sits at the foot of the rail as text rather than as a rail row: it is not somewhere
 * you navigate to, it is a thing you do once, if at all.
 *
 * **Copy report is the important half.** "It broke" is a sentence; the same sentence with
 * a save attached is something that can be loaded and looked at. The link is secondary
 * on purpose - most of the people this is going to will say it in a chat, not open an
 * issue.
 */
export function ReportFooter({
  state,
  slot,
  onCopied,
}: {
  state: GameState
  slot: SlotId
  onCopied: (message: string) => void
}) {
  const [fallback, setFallback] = useState<string | null>(null)

  const copy = () => {
    const text = playerReport(state, slot)
    void copyToClipboard(text).then((ok) => {
      // Refused clipboards get the text in a box rather than an apology. The button has
      // to lead somewhere; it is being pressed by somebody trying to help.
      if (ok) onCopied('Report copied. Paste it wherever you are telling me about this.')
      else setFallback(text)
    })
  }

  return (
    <div className="rail-report">
      {/* The button says what it is for, so the prompt line above it could go - one of
          the rows the foot could not afford. The toast after it says what to do next. */}
      <div className="report-actions">
        <button className="report-copy" onClick={copy} title="Copies a report with your save in it">
          Report a bug
        </button>
        <a className="report-link dim" href={ISSUES} target="_blank" rel="noreferrer">
          or open an issue
        </a>
      </div>
      {/* Faint, and only here: nobody needs it until they are reporting something, and
          then it is the first thing worth knowing. The report carries it anyway; this is
          for "which one are you on?" asked in a chat. */}
      <span className="build-stamp dim">build {BUILD}</span>
      {fallback && <ReportDialog text={fallback} onClose={() => setFallback(null)} />}
    </div>
  )
}
