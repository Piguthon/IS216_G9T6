/* route-privacy.spec.js
 Unit tests for utils/route-privacy.js (the ranking GETs without routes, for someone who isn't
 a member). Each trip's steps and firstBusStopCode start at the member's home, so:
   1. withoutRoute drops them and keeps name, travelMode, minutes, waitMinutes, leaveAt, arriveAt
   2. rankingWithoutRoutes strips every times[] trip and keeps the meeting point's details
   3. tripsWithoutRoutes strips every leave-times trip
   4. None of them change the saved or cached object they are given
*/

import { describe, it, expect } from 'vitest';
import { withoutRoute, rankingWithoutRoutes, tripsWithoutRoutes } from '../route-privacy.js';

// A trip as the ranking saves it, with a route from the member's home
function trip(memberId, name) {
  return {
    memberId,
    name,
    travelMode: 'transit',
    minutes: 32,
    waitMinutes: 4,
    firstBusStopCode: '17179',
    steps: [{ mode: 'BUS', route: '95', fromCode: '17179', points: 'encoded-line-from-home' }],
    leaveAt: '18:28',
    arriveAt: '19:00',
  };
}

function savedRanking() {
  return [
    {
      stationId: 'NS22',
      name: 'Orchard',
      type: 'mrt',
      lat: 1.304,
      lng: 103.832,
      times: [trip('m1', 'Alice'), trip('m2', 'Ben')],
      longestMinutes: 32,
      totalMinutes: 64,
    },
  ];
}

describe('withoutRoute', () => {
  it('removes steps and firstBusStopCode and keeps the times', () => {
    expect(withoutRoute(trip('m1', 'Alice'))).toEqual({
      memberId: 'm1',
      name: 'Alice',
      travelMode: 'transit',
      minutes: 32,
      waitMinutes: 4,
      leaveAt: '18:28',
      arriveAt: '19:00',
    });
  });
});

describe('rankingWithoutRoutes', () => {
  it('strips every trip and keeps the meeting point', () => {
    const [point] = rankingWithoutRoutes(savedRanking());

    expect(point.name).toBe('Orchard');
    expect(point.longestMinutes).toBe(32);
    expect(point.times).toHaveLength(2);
    for (const t of point.times) {
      expect(t).not.toHaveProperty('steps');
      expect(t).not.toHaveProperty('firstBusStopCode');
      expect(t.minutes).toBe(32);
    }
  });

  // The saved ranking is what members get, so it must keep its routes.
  it('does not change the saved ranking', () => {
    const saved = savedRanking();
    const before = JSON.parse(JSON.stringify(saved));
    rankingWithoutRoutes(saved);

    expect(saved).toEqual(before);
    expect(saved[0].times[0].steps).toHaveLength(1);
  });
});

describe('tripsWithoutRoutes', () => {
  it('strips every trip and does not change the cached ones', () => {
    const cached = { trips: [trip('m1', 'Alice'), trip('m2', 'Ben')] };
    const before = JSON.parse(JSON.stringify(cached));
    const shown = tripsWithoutRoutes(cached.trips);

    expect(shown).toHaveLength(2);
    expect(shown[1]).not.toHaveProperty('steps');
    expect(shown[1]).not.toHaveProperty('firstBusStopCode');
    expect(shown[1].leaveAt).toBe('18:28');
    expect(cached).toEqual(before);
  });
});
