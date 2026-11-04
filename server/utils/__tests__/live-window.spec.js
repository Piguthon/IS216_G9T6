/* live-window.spec.js
 Unit tests for utils/live-window.js (when a meetup's live map is open).
 For privacy, members can only share where they are from 1 hour before the meetup until
 30 minutes after it starts. For a meetup at 19:00 the window is 18:00 (open) to 19:30 (closed).

 liveWindowStatus takes `now` as its third argument, so every test passes a fixed time and
 never depends on the real clock. The tests cover:
   1. Before the window, inside it and after it
   2. The exact boundaries: 18:00 is open, 19:30 is closed
   3. The opening and closing times shown in messages, including across midnight
*/

import { describe, it, expect } from 'vitest';
import { liveWindowStatus } from '../live-window.js';

// A fixed moment in Singapore time, in milliseconds
function at(date, time) {
  return new Date(`${date}T${time}+08:00`).getTime();
}

describe('liveWindowStatus', () => {
  // Normal case: the morning of the meetup is too early to share a location.
  it('is not open yet well before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '10:00:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(false);
  });

  // Edge case: one second before the window opens.
  it('is not open one second before the hour before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '17:59:59'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(false);
  });

  // Edge case: the window opens exactly one hour before.
  it('opens exactly one hour before the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '18:00:00'));

    expect(status.isOpen).toBe(true);
    expect(status.hasEnded).toBe(false);
  });

  // Normal case: open at the meetup time.
  it('is open when the meetup starts', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:00:00'));

    expect(status.isOpen).toBe(true);
  });

  // Edge case: still open one second before it closes.
  it('is still open one second before it closes', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:29:59'));

    expect(status.isOpen).toBe(true);
    expect(status.hasEnded).toBe(false);
  });

  // Edge case: the window closes exactly 30 minutes after the meetup starts.
  it('ends exactly 30 minutes after the meetup starts', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '19:30:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(true);
  });

  // Normal case: the next day the live map has ended.
  it('has ended the day after the meetup', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-21', '09:00:00'));

    expect(status.isOpen).toBe(false);
    expect(status.hasEnded).toBe(true);
  });

  // Verify the times shown in "opens at" and "closed at" messages.
  it('gives the opening and closing times as HH:MM', () => {
    const status = liveWindowStatus('2026-11-20', '19:00', at('2026-11-20', '10:00:00'));

    expect(status.opensTime).toBe('18:00');
    expect(status.closesTime).toBe('19:30');
  });

  // Edge case: a meetup just after midnight opens late the evening before.
  it('opens the evening before for a meetup just after midnight', () => {
    const status = liveWindowStatus('2026-11-21', '00:30', at('2026-11-20', '23:45:00'));

    expect(status.opensTime).toBe('23:30');
    expect(status.closesTime).toBe('01:00');
    expect(status.isOpen).toBe(true);
  });
});
