/*
  FILE:      utils/live-window.js
  OWNER:     S (team-written)
  PURPOSE:   When a meetup's live map is open. For privacy, members can only share where they
             are from 1 hour before the meetup until 30 minutes after it starts.
  EXPORTS:   liveWindowStatus(date, time, now) → { isOpen, hasEnded, opensTime, closesTime }
             date "YYYY-MM-DD" · time "HH:MM" · now in milliseconds (defaults to the current time)
             opensTime and closesTime are "HH:MM" in Singapore time, for messages
  USED BY:   controllers/live-controller.js
*/

// STEPS

// TODO 1: Require the Singapore time helpers, and set how long before and after the meetup
//         the live map is open.
const { singaporeToMs, msToSingapore } = require('./meetup-date');

const OPENS_MINUTES_BEFORE = 60;
const CLOSES_MINUTES_AFTER = 30;
const ONE_MINUTE = 60 * 1000; // in milliseconds

// TODO 2: liveWindowStatus(date, time, now)
//           - opensAt is the meetup time minus OPENS_MINUTES_BEFORE
//           - closesAt is the meetup time plus CLOSES_MINUTES_AFTER
//           - isOpen while now is between the two; hasEnded once now reaches closesAt
//           - opensTime and closesTime: msToSingapore(...).time
function liveWindowStatus(date, time, now = Date.now()) {
  const meetupAt = singaporeToMs(date, time);
  const opensAt = meetupAt - OPENS_MINUTES_BEFORE * ONE_MINUTE;
  const closesAt = meetupAt + CLOSES_MINUTES_AFTER * ONE_MINUTE;

  return {
    isOpen: now >= opensAt && now < closesAt,
    hasEnded: now >= closesAt,
    opensTime: msToSingapore(opensAt).time,
    closesTime: msToSingapore(closesAt).time,
  };
}

module.exports = { liveWindowStatus };
