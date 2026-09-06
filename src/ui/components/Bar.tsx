interface BarProps {
  /** 0..1. Clamped, so callers need not guard against overshoot. */
  value: number
  /** Visual role; drives colour only. */
  tone?: 'xp' | 'progress' | 'integrity' | 'enemy'
  label?: string
  /** Shown at the right end of the label row. */
  detail?: string
}

export function Bar({ value, tone = 'progress', label, detail }: BarProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100
  return (
    <div className="bar-wrap">
      {(label || detail) && (
        <div className="bar-label">
          <span>{label}</span>
          <span className="dim">{detail}</span>
        </div>
      )}
      <div className={`bar bar-${tone}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
