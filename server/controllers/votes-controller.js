// Vote endpoints: one vote per member per round; only the host can confirm.

const Meetup = require('../models/meetup-model');
const Vote = require('../models/vote-model');

const KINDS = ['station', 'venue'];

function buildVotes(meetup, votes, memberId) {
  const result = {
    final: { station: meetup.finalStation, venue: meetup.finalVenue },
  };
  for (const kind of KINDS) {
    const counts = new Map();
    let myVote = null;
    for (const vote of votes) {
      if (vote.kind !== kind) continue;
      const tally = counts.get(vote.optionId) || {
        optionId: vote.optionId,
        name: vote.optionName,
        lat: vote.lat,
        lng: vote.lng,
        address: vote.address,
        count: 0,
      };
      tally.count++;
      counts.set(vote.optionId, tally);
      if (vote.memberId === memberId) myVote = vote.optionId;
    }
    const tallies = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    result[kind] = { tallies, myVote };
  }
  return result;
}

// GET /:code: the tallies, my vote and the confirmed choices
exports.getVotes = async (req, res) => {
  try {
    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) return res.status(404).json({ error: 'Unknown code' });

    const votes = await Vote.findByCode(meetup.code);
    res.json(buildVotes(meetup, votes, req.query.memberId || null));
  } catch (error) {
    console.error('Error getting votes:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /:code: casts or moves my vote
exports.castVote = async (req, res) => {
  try {
    const { kind, optionId, optionName, lat, lng, address } = req.body;
    if (!KINDS.includes(kind) || !optionId || !optionName) {
      return res.status(400).json({ error: 'kind, optionId and optionName are required' });
    }

    const meetup = req.meetup;
    const memberId = String(req.member._id);
    if (kind === 'station' && meetup.finalStation) {
      return res.status(409).json({ error: 'The host has already confirmed the meeting point' });
    }
    if (kind === 'venue' && !meetup.finalStation) {
      return res.status(409).json({ error: 'Vote on venues once the host confirms a meeting point' });
    }
    if (kind === 'venue' && meetup.finalVenue) {
      return res.status(409).json({ error: 'The host has already confirmed the venue' });
    }

    await Vote.castVote(meetup.code, memberId, kind, {
      optionId: String(optionId),
      optionName: String(optionName),
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      address: typeof address === 'string' ? address : '',
    });
    const votes = await Vote.findByCode(meetup.code);
    res.json(buildVotes(meetup, votes, memberId));
  } catch (error) {
    console.error('Error casting vote:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /:code/confirm: the host confirms the final choice, or reopens voting
exports.confirmChoice = async (req, res) => {
  try {
    const { kind, optionId, name, address, lat, lng } = req.body;
    if (!KINDS.includes(kind)) {
      return res.status(400).json({ error: 'kind must be station or venue' });
    }

    const meetup = await Meetup.findByCode(req.params.code);
    if (!meetup) return res.status(404).json({ error: 'Unknown code' });

    const host = meetup.members[0];
    if (!host || host.userId !== String(req.user._id)) {
      return res.status(403).json({ error: 'Only the host can confirm the final choice' });
    }
    if (kind === 'venue' && !meetup.finalStation) {
      return res.status(409).json({ error: 'Confirm a meeting point first' });
    }

    let choice = null;
    if (optionId) {
      if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ error: 'name, lat and lng are required' });
      }
      choice = { optionId: String(optionId), name, lat, lng };
      if (kind === 'venue') choice.address = address || '';
    }

    const updated = await Meetup.setFinalChoice(meetup.code, kind, choice);
    if (kind === 'station') await Vote.clearKind(meetup.code, 'venue');

    const votes = await Vote.findByCode(meetup.code);
    res.json(buildVotes(updated, votes, String(host._id)));
  } catch (error) {
    console.error('Error confirming choice:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
};
