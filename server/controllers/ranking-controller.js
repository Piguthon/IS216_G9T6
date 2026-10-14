/*
  PITCH PLACEHOLDER (demo/pitch branch only; never merge into integration or main)
  Returns the sample ranking in sample-data/ranking-placeholder.json, with the sample minutes
  given to this meetup's real members. No OneMap calls, no fairness rule.
  JS replaces this with the real ranking.
*/
const Meetup = require('../models/meetup-model');
const placeholderRanking = require('../sample-data/ranking-placeholder.json');

exports.getRanking = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) {
      return res.status(404).json({ error: 'Unknown code' });
    }

    const ready = meetup.members.filter((member) => member.start);
    if (ready.length < 2) {
      return res.status(400).json({ error: 'At least 2 members need a start point' });
    }

    const ranking = placeholderRanking.map((point) => {
      const times = ready.map((member, i) => ({
        memberId: String(member._id),
        name: member.name,
        minutes: point.times[i % point.times.length].minutes + Math.floor(i / 2) * 3,
        firstBusStopCode: null,
      }));
      let longestMinutes = 0;
      let totalMinutes = 0;
      for (const t of times) {
        if (t.minutes > longestMinutes) longestMinutes = t.minutes;
        totalMinutes += t.minutes;
      }
      return { stationId: point.stationId, name: point.name, lat: point.lat, lng: point.lng, times, longestMinutes, totalMinutes };
    });

    ranking.sort((a, b) => a.longestMinutes - b.longestMinutes || a.totalMinutes - b.totalMinutes);
    res.json(ranking);
  } catch (error) {
    console.error('Error getting placeholder ranking:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
