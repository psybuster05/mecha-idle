import { useEffect, useRef } from 'react'

/**
 * The report, in a box you can select, for when the clipboard says no.
 *
 * A browser can refuse `navigator.clipboard` for reasons the player did nothing to cause
 * - a permission never granted, an embedded webview, an automation context - and a
 * "Copy" button that fails is a dead end at exactly the moment somebody was trying to
 * help. This is the floor under it: the text is here, selected, and Ctrl+C works.
 *
 * Worth having even though the API usually works, because the times it does not are
 * unevenly distributed. They land on whoever has the unusual browser, which is also the
 * person most likely to have found the bug.
 */
export function ReportDialog({ text, onClose }: { text: string; onClose: () => void }) {
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Selected on open, so copying is one keystroke rather than a drag through 2KB.
    box.current?.focus()
    box.current?.select()
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>Copy this and send it on</h2>
        <p className="dim">
          The browser would not let me put it on the clipboard for you. It is selected
          already - Ctrl+C, or Cmd+C.
        </p>
        <textarea className="report-box" ref={box} readOnly value={text} rows={10} />
        <div className="modal-actions">
          <button onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
