import { describe, it, expect } from 'vitest'
import { formatDuration, formatNumber, formatSeconds, formatSigned } from '../format'

describe('formatNumber', () => {
  it('uses separators below a million', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(48_000)).toBe('48,000')
    expect(formatNumber(999_999)).toBe('999,999')
  })

  it('switches to suffixes above a million, where idle numbers live', () => {
    expect(formatNumber(1_000_000)).toBe('1.00M')
    expect(formatNumber(1_250_000)).toBe('1.25M')
    expect(formatNumber(3_400_000_000)).toBe('3.40B')
    expect(formatNumber(2_000_000_000_000)).toBe('2.00T')
  })

  it('truncates fractions rather than showing them', () => {
    expect(formatNumber(12.9)).toBe('12')
  })
})

describe('formatDuration', () => {
  it('reads naturally at every scale', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(8 * 3600)).toBe('8h')
    expect(formatDuration(8 * 3600 + 12 * 60)).toBe('8h 12m')
  })

  it('never shows negative time', () => {
    expect(formatDuration(-500)).toBe('0s')
  })
})

describe('small helpers', () => {
  it('formats action timers to a tenth', () => {
    expect(formatSeconds(3)).toBe('3.0s')
    expect(formatSeconds(1.25)).toBe('1.3s')
  })

  it('signs gains but not losses twice', () => {
    expect(formatSigned(120)).toBe('+120')
    expect(formatSigned(-40)).toBe('-40')
    expect(formatSigned(0)).toBe('0')
  })
})
