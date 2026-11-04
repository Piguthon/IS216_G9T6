/* meetup-date.spec.js
 Unit tests for utils/meetup-date.js (Singapore dates and the time trips are planned for).
   1. isAllowedMeetupDate: rejects bad formats, impossible dates and past dates; accepts today
   2. tripTimeForMeetup: plans trips 45 minutes before the meetup, but uses 05:30 overnight
      (from 23:30 it moves to 05:30 the next day; before 05:30 it moves to 05:30 that morning)
   3. singaporeToMs and msToSingapore: convert between Singapore time and milliseconds

 isAllowedMeetupDate reads today's date from the clock, so the clock is fixed with
 vi.setSystemTime (only Date is faked). The tests never depend on the real date.
*/

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
    vi.setSystemTime(new Date('2026-11-04T12:00:00+08:00')); // noon on 4 Nov 2026 in Singapore
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Normal case: today and later dates are allowed.
  it('accepts today and future dates', () => {
    expect(isAllowedMeetupDate('2026-11-04')).toBe(true);
    expect(isAllowedMeetupDate('2026-11-05')).toBe(true);
    expect(isAllowedMeetupDate('2027-01-01')).toBe(true);
  });

  // Edge case: yesterday is just before the boundary.
  it('rejects past dates', () => {
    expect(isAllowedMeetupDate('2026-11-03')).toBe(false);
    expect(isAllowedMeetupDate('2025-12-31')).toBe(false);
  });

  // Only YYYY-MM-DD strings are accepted.
  it('rejects dates in the wrong format', () => {
    expect(isAllowedMeetupDate('20-11-2026')).toBe(false);
    expect(isAllowedMeetupDate('2026/11/20')).toBe(false);
    expect(isAllowedMeetupDate('2026-1-5')).toBe(false);
    expect(isAllowedMeetupDate('')).toBe(false);
    expect(isAllowedMeetupDate(20261120)).toBe(false);
    expect(isAllowedMeetupDate(undefined)).toBe(false);
  });

  // Dates in the right format that don't exist on the calendar are rejected.
  it('rejects impossible dates', () => {
    expect(isAllowedMeetupDate('2026-02-30')).toBe(false);
    expect(isAllowedMeetupDate('2026-13-01')).toBe(false);
    expect(isAllowedMeetupDate('2027-02-29')).toBe(false); // 2027 is not a leap year
  });

  // Edge case: 29 February exists in a leap year.
  it('accepts 29 February in a leap year', () => {
    expect(isAllowedMeetupDate('2028-02-29')).toBe(true);
  });

  // "Today" is Singapore's date: at 00:30 on 5 Nov in Singapore it is still 4 Nov in UTC.
  it('uses the Singapore date to decide what is past', () => {
    vi.setSystemTime(new Date('2026-11-05T00:30:00+08:00'));

    expect(isAllowedMeetupDate('2026-11-04')).toBe(false);
    expect(isAllowedMeetupDate('2026-11-05')).toBe(true);
  });
});

describe('tripTimeForMeetup', () => {
  // Normal case: trips are planned 45 minutes before the meetup.
  it('plans the trip 45 minutes before the meetup', () => {
    expect(tripTimeForMeetup('2026-11-20', '19:00')).toEqual({ date: '2026-11-20', time: '18:15' });
  });

  // Edge case: 45 minutes before 00:14 is 23:29, just before the overnight cut-off.
  it('keeps a trip at 23:29 on the night before', () => {
    expect(tripTimeForMeetup('2026-11-21', '00:14')).toEqual({ date: '2026-11-20', time: '23:29' });
  });

  // Edge case: a trip at exactly 23:30 moves to 05:30 the next morning.
  it('moves a trip at 23:30 to 05:30 the next day', () => {
    expect(tripTimeForMeetup('2026-11-21', '00:15')).toEqual({ date: '2026-11-21', time: '05:30' });
  });

  // A late-night trip that falls on 31 December moves into the new year.
  it('moves a late-night trip on 31 December to 05:30 on 1 January', () => {
    expect(tripTimeForMeetup('2027-01-01', '00:30')).toEqual({ date: '2027-01-01', time: '05:30' });
  });

  // An early-morning trip moves to 05:30 the same morning, when trains start running.
  it('moves a trip before 05:30 to 05:30 that morning', () => {
    expect(tripTimeForMeetup('2026-11-20', '03:00')).toEqual({ date: '2026-11-20', time: '05:30' });
    expect(tripTimeForMeetup('2026-11-20', '06:14')).toEqual({ date: '2026-11-20', time: '05:30' });
  });

  // Edge case: a trip at exactly 05:30 is kept.
  it('keeps a trip at exactly 05:30', () => {
    expect(tripTimeForMeetup('2026-11-20', '06:15')).toEqual({ date: '2026-11-20', time: '05:30' });
  });
});

describe('singaporeToMs and msToSingapore', () => {
  // Singapore is UTC+8, so 08:00 in Singapore is midnight UTC.
  it('converts Singapore time to milliseconds', () => {
    expect(singaporeToMs('2026-11-20', '08:00')).toBe(Date.UTC(2026, 10, 20, 0, 0));
  });

  // Converting there and back gives the same date and time.
  it('converts milliseconds back to the same Singapore date and time', () => {
    const ms = singaporeToMs('2026-11-20', '23:45');

    expect(msToSingapore(ms)).toEqual({ date: '2026-11-20', time: '23:45' });
  });
});
