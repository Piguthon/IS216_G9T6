/* fairness.spec.js
 Unit tests for utils/fairness.js, the core of FairSpot's ranking.
 The functions are pure (no database or API calls), so each test passes in sample data and
 checks the value that comes back:
   1. rankCandidates: the shortest longest journey wins (minimax fairness), ties go to the
      lower total travel time, and the input is not changed
   2. findMidpoint: the average of the group's start points
   3. distanceKm: the straight-line distance between two points
   4. pickCandidates: the nearest stations of each type, limited by perType and maxKmByType
*/

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
  // The fairness rule: the point whose slowest trip is shortest comes first.
  it('puts the point with the shortest longest journey first', () => {
    const lopsided = candidate('lopsided', [5, 40]); // total 45, but one person travels 40
    const fair = candidate('fair', [25, 25]); // total 50, nobody travels more than 25

    const ranked = rankCandidates([lopsided, fair]);

    expect(ranked[0].stationId).toBe('fair');
    expect(ranked[1].stationId).toBe('lopsided');
  });

  // When the longest journeys are equal, less travel overall wins.
  it('breaks a tie on the longest journey with the lower total', () => {
    const slower = candidate('slower', [30, 30]); // longest 30, total 60
    const quicker = candidate('quicker', [10, 30]); // longest 30, total 40

    const ranked = rankCandidates([slower, quicker]);

    expect(ranked.map((point) => point.stationId)).toEqual(['quicker', 'slower']);
  });

  // Verify that every ranked point carries its longest and total minutes.
  it('fills in longestMinutes and totalMinutes', () => {
    const ranked = rankCandidates([candidate('bishan', [12, 34, 20])]);

    expect(ranked[0].longestMinutes).toBe(34);
    expect(ranked[0].totalMinutes).toBe(66);
    expect(ranked[0].times).toHaveLength(3);
  });

  // Verify that a longer list is fully sorted, not just its first item.
  it('sorts every point from fairest to least fair', () => {
    const ranked = rankCandidates([
      candidate('c', [50, 10]),
      candidate('a', [20, 20]),
      candidate('d', [60, 60]),
      candidate('b', [15, 25]),
    ]);

    expect(ranked.map((point) => point.stationId)).toEqual(['a', 'b', 'c', 'd']);
  });

  // The function returns new objects, so the caller's data is never changed.
  it('does not change the candidates passed in', () => {
    const input = [candidate('a', [20, 30]), candidate('b', [10, 10])];

    rankCandidates(input);

    expect(input[0].stationId).toBe('a');
    expect(input[0]).not.toHaveProperty('longestMinutes');
  });

  // Edge case: nothing to rank gives an empty list.
  it('returns an empty list when there are no candidates', () => {
    expect(rankCandidates([])).toEqual([]);
  });
});

describe('findMidpoint', () => {
  // Verify that two start points meet in the middle.
  it('averages the latitudes and longitudes', () => {
    const midpoint = findMidpoint([
      { lat: 1, lng: 103 },
      { lat: 2, lng: 104 },
    ]);

    expect(midpoint).toEqual({ lat: 1.5, lng: 103.5 });
  });

  // Edge case: one member's midpoint is their own start point.
  it('returns the only point when there is one', () => {
    expect(findMidpoint([{ lat: 1.3, lng: 103.8 }])).toEqual({ lat: 1.3, lng: 103.8 });
  });
});

describe('distanceKm', () => {
  // Edge case: a point is 0 km from itself.
  it('is 0 between a point and itself', () => {
    expect(distanceKm({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0);
  });

  // One degree of latitude is about 111 km anywhere on Earth.
  it('measures about 111 km for one degree of latitude', () => {
    const km = distanceKm({ lat: 1, lng: 103.8 }, { lat: 2, lng: 103.8 });

    expect(km).toBeGreaterThan(111);
    expect(km).toBeLessThan(111.4);
  });
});

describe('pickCandidates', () => {
  const midpoint = { lat: 1.3, lng: 103.8 };
  // 0.01 degrees of latitude is about 1.1 km north of the midpoint
  const stations = [
    { stationId: 'mrt-far', type: 'mrt', lat: 1.35, lng: 103.8 }, // about 5.6 km
    { stationId: 'mrt-near', type: 'mrt', lat: 1.31, lng: 103.8 }, // about 1.1 km
    { stationId: 'mrt-mid', type: 'mrt', lat: 1.32, lng: 103.8 }, // about 2.2 km
    { stationId: 'int-near', type: 'interchange', lat: 1.315, lng: 103.8 }, // about 1.7 km
    { stationId: 'int-far', type: 'interchange', lat: 1.34, lng: 103.8 }, // about 4.4 km
  ];

  // Verify that perType limits how many of each type are kept, nearest first.
  it('keeps the nearest stations of each type, nearest first overall', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 2, interchange: 1 });

    expect(picked.map((station) => station.stationId)).toEqual([
      'mrt-near',
      'int-near',
      'mrt-mid',
    ]);
  });

  // Verify that maxKmByType leaves out stations that are too far for their type.
  it('leaves out stations beyond the distance limit for their type', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 5, interchange: 5 }, { interchange: 3 });
    const ids = picked.map((station) => station.stationId);

    expect(ids).toContain('int-near');
    expect(ids).not.toContain('int-far');
    expect(ids).toContain('mrt-far'); // the limit is only for interchanges
    expect(picked).toHaveLength(4);
  });

  // Verify that a type missing from perType is not picked at all.
  it('only picks the types listed in perType', () => {
    const picked = pickCandidates(stations, midpoint, { mrt: 30 });

    expect(picked).toHaveLength(3);
    expect(picked.every((station) => station.type === 'mrt')).toBeTruthy();
  });

  // Edge case: no stations gives an empty list.
  it('returns an empty list when there are no stations', () => {
    expect(pickCandidates([], midpoint, { mrt: 30, interchange: 2 })).toEqual([]);
  });
});
