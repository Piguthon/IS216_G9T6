// Singapore is UTC+8. Returns today as YYYY-MM-DD.
function todayInSingapore() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// The current date and time in Singapore: { date: 'YYYY-MM-DD', time: 'HH:MM' }
function nowInSingapore() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  return { date: now.slice(0, 10), time: now.slice(11, 16) };
}

// When to time trips for: now, except overnight when trains and buses are stopped or about to.
// From 23:30 it uses 05:30 the next day, and before 05:30 it uses 05:30 that same morning.
function tripTimeInSingapore(now = nowInSingapore()) {
  if (now.time >= '23:30') {
    const nextDay = new Date(`${now.date}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { date: nextDay.toISOString().slice(0, 10), time: '05:30' };
  }
  if (now.time < '05:30') return { date: now.date, time: '05:30' };
  return now;
}

function isAllowedMeetupDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  return date >= todayInSingapore();
}

module.exports = { isAllowedMeetupDate, todayInSingapore, nowInSingapore, tripTimeInSingapore };
