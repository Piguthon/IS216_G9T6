// When a meetup's live map is open: from 1 hour before until 30 minutes after it starts.

const { singaporeToMs, msToSingapore } = require('./meetup-date');

const OPENS_MINUTES_BEFORE = 60;
const CLOSES_MINUTES_AFTER = 30;
const ONE_MINUTE = 60 * 1000;

// The live map opens OPENS_MINUTES_BEFORE the meetup and closes CLOSES_MINUTES_AFTER it starts;
// hasEnded is true from closesAt on
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
