// Unit tests for utils/live-window.js.

import { describe, it, expect } from 'vitest';
import { liveWindowStatus } from '../live-window.js';

// A fixed moment in Singapore time, in milliseconds
function at(date, time) {
  return new Date(`${date}T${time}+08:00`).getTime();
}

describe('liveWindowStatus', () => {
  it('is not open yet well before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '10:00:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(false);
  });

  it('is not open one second before the hour before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '17:59:59'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(false);
  });

  it('opens exactly one hour before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '18:00:00'));

    expect(status.isOpen).toBe(true);
    expect(status.hasEnded).toBe(false);
  });

  it('is open when the meetup starts', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:00:00'));

    expect(status.isOpen).toBe(true);
  });

  it('is still open one second before it closes', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:29:59'));

    expect(status.isOpen).toBe(true);
    expect(status.hasEnded).toBe(false);
  });

  it('ends exactly 30 minutes after the meetup starts', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:30:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(true);
  });

  it('has ended the day after the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-21', '09:00:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(true);
  });

  it('gives the opening and closing times as HH:MM', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '10:00:00'));

    expect(status.opensTime).toBe('18:00');
    expect(status.closesTime).toBe('19:30');
  });

  it('opens the evening before for a meetup just after midnight', () => {
    const status = liveWindowStatus('2026-11-21', '00:30', at('2026-11-20', '23:45:00'));

    expect(status.opensTime).toBe('23:30');
    expect(status.closesTime).toBe('01:00');
    expect(status.isOpen).toBe(true);
  });
});
