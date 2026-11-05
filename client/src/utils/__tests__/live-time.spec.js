// Unit tests for utils/live-time.js.

import { describe, it, expect } from 'vitest'
import { STALE_AFTER_MS, timeAgo, isStale, byTripTime } from '../live-time'

const NOW = new Date('2026-11-02T12:00:00Z').getTime()

function secondsAgo(seconds) {
  return new Date(NOW - seconds * 1000).toISOString()
}

describe('timeAgo', () => {
  it('says just now for the first 10 seconds', () => {
    expect(timeAgo(secondsAgo(0), NOW)).toBe('just now')
    expect(timeAgo(secondsAgo(9), NOW)).toBe('just now')
  })

  it('counts seconds, then whole minutes', () => {
    expect(timeAgo(secondsAgo(40), NOW)).toBe('40s ago')
    expect(timeAgo(secondsAgo(200), NOW)).toBe('3 min ago')
  })

  it('treats a time slightly ahead of this device as just now', () => {
    expect(timeAgo(secondsAgo(-30), NOW)).toBe('just now')
  })
})

describe('isStale', () => {
  it('is false up to the limit and true after it', () => {
    const limit = STALE_AFTER_MS / 1000
    expect(isStale(secondsAgo(limit), NOW)).toBe(false)
    expect(isStale(secondsAgo(limit + 1), NOW)).toBe(true)
  })
})

describe('byTripTime', () => {
  it('puts the soonest trip first and people without a route last', () => {
    const people = [{ etaMinutes: null }, { etaMinutes: 30 }, { etaMinutes: 12 }]
    const minutes = [...people].sort(byTripTime).map((person) => person.etaMinutes)
    expect(minutes).toEqual([12, 30, null])
  })
})
