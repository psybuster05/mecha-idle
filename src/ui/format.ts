/** Display helpers. Presentation only - no game rules live here. */

/** 1234 -> "1,234"; 1_250_000 -> "1.25M". Idle games out-scale plain separators fast. */
export function formatNumber(value: number): string {
  const n = Math.floor(value)
  if (Math.abs(n) < 1_000_000) return n.toLocaleString('en-US')
  const units = [
    { limit: 1e15, suffix: 'Q' },
    { limit: 1e12, suffix: 'T' },
    { limit: 1e9, suffix: 'B' },
    { limit: 1e6, suffix: 'M' },
  ]
  for (const { limit, suffix } of units) {
    if (Math.abs(n) >= limit) return `${(n / limit).toFixed(2)}${suffix}`
  }
  return n.toLocaleString('en-US')
}

/** Seconds -> "8h 12m", "12m 30s", "45s". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  if (minutes > 0) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  return `${secs}s`
}

/** Short form for action timers, where sub-second precision reads as responsiveness. */
export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value)
}
