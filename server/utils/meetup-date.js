const MINUTES_BEFORE_MEETUP = 45;

// Singapore is UTC+8. Returns today as YYYY-MM-DD.
function todayInSingapore() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// A Singapore date and time as milliseconds
function singaporeToMs(date, time) {
  return new Date(`${date}T${time}:00+08:00`).getTime();
}

// Milliseconds as a Singapore date and time: { date: 'YYYY-MM-DD', time: 'HH:MM' }
function msToSingapore(ms) {
  const inSingapore = new Date(ms + 8 * 60 * 60 * 1000).toISOString();
  return { date: inSingapore.slice(0, 10), time: inSingapore.slice(11, 16) };
}

// When to time a meetup's trips for: 45 minutes before it, when people are on their way, except
// overnight when trains and buses are stopped or about to.
// From 23:30 it uses 05:30 the next day, and before 05:30 it uses 05:30 that same morning.
function tripTimeForMeetup(date, time) {
  const trip = msToSingapore(singaporeToMs(date, time) - MINUTES_BEFORE_MEETUP * 60 * 1000);
  if (trip.time >= '23:30') {
    const nextDay = new Date(`${trip.date}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { date: nextDay.toISOString().slice(0, 10), time: '05:30' };
  }
  if (trip.time < '05:30') return { date: trip.date, time: '05:30' };
  return trip;
}

function isAllowedMeetupDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  return date >= todayInSingapore();
}

module.exports = {
  isAllowedMeetupDate,
  todayInSingapore,
  singaporeToMs,
  msToSingapore,
  tripTimeForMeetup,
};
