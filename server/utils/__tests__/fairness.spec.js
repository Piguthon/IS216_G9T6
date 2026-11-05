// Unit tests for utils/fairness.js.

import { describe, it, expect } from 'vitest';
import { rankCandidates, findMidpoint, distanceKm, pickCandidates } from '../fairness.js';

// A candidate meeting point with one trip per member, in minutes
function candidate(stationId, minutes) {
  return {
    stationId,
    name: stationId,
    times: minutes.map((m, i) => ({ memberId: `m${i + 1}`, minutes: m })),
  };
}

describe('rankCandidates', () => {
  it('puts the point with the shortest longest journey first', () => {
    const lopsided = candidate('lopsided', [5, 40]);
    const fair = candidate('fair', [25, 25]);

    const ranked = rankCandidates([lopsided, fair]);

    expect(ranked[0].stationId).toBe('fair');
    expect(ranked[1].stationId).toBe('lopsided');
  });

  it('breaks a tie on the longest journey with the lower total', () => {
    const slower = candidate('slower', [30, 30]);
    const quicker = candidate('quicker', [10, 30]);

    const ranked = rankCandidates([slower, quicker]);

    expect(ranked.map((point) => point.stationId)).toEqual(['quicker', 'slower']);
  });

  it('fills in longestMinutes and totalMinutes', () => {
    const ranked = rankCandidates([candidate('bishan', [12, 34, 20])]);

    expect(ranked[0].longestMinutes).toBe(34);
    expect(ranked[0].totalMinutes).toBe(66);
    expect(ranked[0].times).toHaveLength(3);
  });

  it('sorts every point from fairest to least fair', () => {
    const ranked = rankCandidates([
      candidate('c', [50, 10]),
      candidate('a', [20, 20]),
      candidate('d', [60, 60]),
      candidate('b', [15, 25]),
    ]);

    expect(ranked.map((point) => point.stationId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not change the candidates passed in', () => {
    const input = [candidate('a', [20, 30]), candidate('b', [10, 10])];

    rankCandidates(input);

    expect(input[0].stationId).toBe('a');
    expect(input[0]).not.toHaveProperty('longestMinutes');
  });

  it('returns an empty list when there are no candidates', () => {
    expect(rankCandidates([])).toEqual([]);
  });
});

describe('findMidpoint', () => {
  it('averages the latitudes and longitudes', () => {
    const midpoint = findMidpoint([
      { lat: 1, lng: 103 },
      { lat: 2, lng: 104 },
    ]);

    expect(midpoint).toEqual({ lat: 1.5, lng: 103.5 });
  });

  it('returns the only point when there is one', () => {
    expect(findMidpoint([{ lat: 1.3, lng: 103.8 }])).toEqual({ lat: 1.3, lng: 103.8 });
  });
});

describe('distanceKm', () => {
  it('is 0 between a point and itself', () => {
    expect(distanceKm({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0);
  });

  it('measures about 111 km for one degree of latitude', () => {
    const km = distanceKm({ lat: 1, lng: 103.8 }, { lat: 2, lng: 103.8 });

    expect(km).toBeGreaterThan(111);
    expect(km).toBeLessThan(111.4);
  });
});

describe('pickCandidates', () => {
  const midpoint = { lat: 1.3, lng: 103.8 };
  const stations = [
    { stationId: 'mrt-far', type: 'mrt', lat: 1.35, lng: 103.8 },
    { stationId: 'mrt-near', type: 'mrt', lat: 1.31, lng: 103.8 },
    { stationId: 'mrt-mid', type: 'mrt', lat: 1.32, lng: 103.8 },
    { stationId: 'int-near', type: 'interchange', lat: 1.315, lng: 103.8 },
    { stationId: 'int-far', type: 'interchange', lat: 1.34, lng: 103.8 },
  ];

  it('keeps the nearest stations of each type, nearest first overall', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 2, interchange: 1 });

    expect(picked.map((station) => station.stationId)).toEqual([
      'mrt-near',
      'int-near',
      'mrt-mid',
    ]);
  });

  it('leaves out stations beyond the distance limit for their type', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 5, interchange: 5 }, { interchange: 3 });
    const ids = picked.map((station) => station.stationId);

    expect(ids).toContain('int-near');
    expect(ids).not.toContain('int-far');
    expect(ids).toContain('mrt-far');
    expect(picked).toHaveLength(4);
  });

  it('only picks the types listed in perType', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 30 });

    expect(picked).toHaveLength(3);
    expect(picked.every((station) => station.type === 'mrt')).toBeTruthy();
  });

  it('returns an empty list when there are no stations', () => {
    expect(pickCandidates([], midpoint, { mrt: 30, interchange: 2 })).toEqual([]);
  });
});
