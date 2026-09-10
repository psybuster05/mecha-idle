import { Component, type ErrorInfo, type ReactNode } from 'react'
import { LocalStorageAdapter, readActiveSlot, slotKey } from '../../platform/SaveAdapter'
import { copyToClipboard, crashReport } from '../diagnostics'
import { ReportDialog } from './ReportDialog'

/**
 * The screen that replaces a black one.
 *
 * A React error unmounts the whole tree, so without this a tester who hits a bug gets a
 * blank page, closes the tab, and never tells anyone - which is the same as the bug not
 * being reported at all. I watched that happen repeatedly while building the stage: the
 * app died, the page went black, and nothing on screen said why.
 *
 * **Nothing here writes to the save.** The game in memory is by definition untrustworthy
 * at this point, and the copy on disk is the last good one. That is the same rule the
 * loader keeps when it cannot read a save, and the same one reset has to obey - there is
 * one meaning of "do not write over what is on disk".
 *
 * A class, because `getDerivedStateFromError` has no hook equivalent. It is the only
 * class component in the project and this is why.
 */

interface State {
  error: unknown
  componentStack?: string
  copied: 'no' | 'yes'
  /** Set when the clipboard refused, so the text can be shown to be copied by hand. */
  fallback: string | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, copied: 'no', fallback: null }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Also to the console, so anyone with devtools open gets the real thing rather than
    // the summary. React logs it too; this survives a stripped build.
    console.error('Mecha Idle crashed', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? undefined })
  }

  private copy = () => {
    const slot = readActiveSlot()
    // Read the save straight off disk rather than from anything React was holding.
    void new LocalStorageAdapter(slotKey(slot)).load().then(async (stored) => {
      const text = crashReport(this.state.error, slot, stored, this.state.componentStack)
      const ok = await copyToClipboard(text)
      this.setState(ok ? { copied: 'yes', fallback: null } : { copied: 'no', fallback: text })
    })
  }

  render() {
    if (this.state.error === null) return this.props.children

    const message =
      this.state.error instanceof Error ? this.state.error.message : String(this.state.error)

    return (
      <main className="app crashed">
        <h1>MECHA IDLE</h1>
        <h2>Something broke.</h2>
        {/* Said plainly and first, because it is the only question a player actually has
            at this moment. */}
        <p>
          <strong>Your save is safe.</strong> Nothing has been written over - the game
          stops writing the moment it stops trusting itself.
        </p>
        <p className="dim">
          Copying the report below and sending it on is the whole reason this screen
          exists. It carries the error and your save.
        </p>
        <pre className="crash-error">{message}</pre>
        <div className="modal-actions">
          <button className="primary" onClick={this.copy}>
            {this.state.copied === 'yes' ? 'Copied - now paste it somewhere' : 'Copy report'}
          </button>
          <button onClick={() => location.reload()}>Reload</button>
        </div>
        {this.state.fallback !== null && (
          <ReportDialog
            text={this.state.fallback}
            onClose={() => this.setState({ fallback: null })}
          />
        )}
      </main>
    )
  }
}
