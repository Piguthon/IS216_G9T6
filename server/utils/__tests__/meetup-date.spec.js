// Unit tests for utils/meetup-date.js.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAllowedMeetupDate,
  tripTimeForMeetup,
  singaporeToMs,
  msToSingapore,
} from '../meetup-date.js';

describe('isAllowedMeetupDate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-04T12:00:00+08:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts today and future dates', () => {
    expect(isAllowedMeetupDate('2026-11-04')).toBe(true);
    expect(isAllowedMeetupDate('2026-11-05')).toBe(true);
    expect(isAllowedMeetupDate('2027-01-01')).toBe(true);
  });

  it('rejects past dates', () => {
    expect(isAllowedMeetupDate('2026-11-03')).toBe(false);
    expect(isAllowedMeetupDate('2025-12-31')).toBe(false);
  });

  it('rejects dates in the wrong format', () => {
    expect(isAllowedMeetupDate('20-11-2026')).toBe(false);
    expect(isAllowedMeetupDate('2026/11/20')).toBe(false);
    expect(isAllowedMeetupDate('2026-1-5')).toBe(false);
    expect(isAllowedMeetupDate('')).toBe(false);
    expect(isAllowedMeetupDate(20261120)).toBe(false);
    expect(isAllowedMeetupDate(undefined)).toBe(false);
  });

  it('rejects impossible dates', () => {
    expect(isAllowedMeetupDate('2026-02-30')).toBe(false);
    expect(isAllowedMeetupDate('2026-13-01')).toBe(false);
    expect(isAllowedMeetupDate('2027-02-29')).toBe(false);
  });

  it('accepts 29 February in a leap year', () => {
    expect(isAllowedMeetupDate('2028-02-29')).toBe(true);
  });

  it('uses the Singapore date to decide what is past', () => {
    vi.setSystemTime(new Date('2026-11-05T00:30:00+08:00'));

    expect(isAllowedMeetupDate('2026-11-04')).toBe(false);
    expect(isAllowedMeetupDate('2026-11-05')).toBe(true);
  });
});

describe('tripTimeForMeetup', () => {
  it('plans the trip 45 minutes before the meetup', () => {
    expect(tripTimeForMeetup('2026-11-20', '19:00')).toEqual({ date: '2026-11-20', time: '18:15' });
  });

  it('keeps a trip at 23:29 on the night before', () => {
    expect(tripTimeForMeetup('2026-11-21', '00:14')).toEqual({ date: '2026-11-20', time: '23:29' });
  });

  it('moves a trip at 23:30 to 05:30 the next day', () => {
    expect(tripTimeForMeetup('2026-11-21', '00:15')).toEqual({ date: '2026-11-21', time: '05:30' });
  });

  it('moves a late-night trip on 31 December to 05:30 on 1 January', () => {
    expect(tripTimeForMeetup('2027-01-01', '00:30')).toEqual({ date: '2027-01-01', time: '05:30' });
  });

  it('moves a trip before 05:30 to 05:30 that morning', () => {
    expect(tripTimeForMeetup('2026-11-20', '03:00')).toEqual({ date: '2026-11-20', time: '05:30' });
    expect(tripTimeForMeetup('2026-11-20', '06:14')).toEqual({ date: '2026-11-20', time: '05:30' });
  });

  it('keeps a trip at exactly 05:30', () => {
    expect(tripTimeForMeetup('2026-11-20', '06:15')).toEqual({ date: '2026-11-20', time: '05:30' });
  });
});

describe('singaporeToMs and msToSingapore', () => {
  it('converts Singapore time to milliseconds', () => {
    expect(singaporeToMs('2026-11-20', '08:00')).toBe(Date.UTC(2026, 10, 20, 0, 0));
  });

  it('converts milliseconds back to the same Singapore date and time', () => {
    const ms = singaporeToMs('2026-11-20', '23:45');

    expect(msToSingapore(ms)).toEqual({ date: '2026-11-20', time: '23:45' });
  });
});
