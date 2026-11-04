/* route-steps.spec.js
 Unit tests for utils/route-steps.js (labels for each step of a member's route) and
 utils/polyline.js (decoding OneMap's route lines into map points).
*/

import { describe, it, expect } from 'vitest'
import { describeStep } from '../route-steps'
import { decodePolyline } from '../polyline'

describe('describeStep', () => {
  it('names the meeting point on the last walk', () => {
    const step = { mode: 'WALK', from: 'BISHAN MRT', to: 'Destination', minutes: 2 }
    expect(describeStep(step, 'Bishan')).toEqual({
      label: 'Walk',
      details: 'To Bishan',
      minutes: 2,
    })
  })

  it('describes the two parts of a car trip', () => {
    const drive = { mode: 'CAR', from: 'Origin', to: 'Destination', stops: 0, minutes: 24 }
    const park = { mode: 'PARK', from: 'Origin', to: 'Destination', stops: 0, minutes: 10 }
    expect(describeStep(drive, 'Bishan')).toEqual({
      label: 'Drive',
      details: 'To Bishan',
      minutes: 24,
    })
    expect(describeStep(park, 'Bishan')).toEqual({
      label: 'Park',
      details: 'And walk to Bishan',
      minutes: 10,
    })
  })

  it('shows the bus number, stops and stop codes', () => {
    const step = {
      mode: 'BUS',
      route: '99',
      from: 'BLK 986 CP',
      fromCode: '27521',
      to: 'JOO KOON INT',
      toCode: '24009',
      stops: 6,
      minutes: 9,
    }
    expect(describeStep(step, 'Bishan')).toEqual({
      label: 'Bus 99',
      details: 'Board at BLK 986 CP (27521), alight at JOO KOON INT (24009) (6 stops)',
      minutes: 9,
    })
  })

  it('names the train line and does not repeat a code already in the name', () => {
    const step = {
      mode: 'SUBWAY',
      route: 'EW',
      routeName: 'EAST WEST LINE',
      from: 'JOO KOON MRT STATION EW29',
      fromCode: 'EW29',
      to: 'BUONA VISTA MRT STATION EW21',
      toCode: 'EW21',
      stops: 1,
      minutes: 23,
    }
    expect(describeStep(step, 'Bishan')).toEqual({
      label: 'East West Line',
      details:
        'Board at JOO KOON MRT STATION EW29, alight at BUONA VISTA MRT STATION EW21 (1 stop)',
      minutes: 23,
    })
  })
})

describe('decodePolyline', () => {
  it('decodes the example from the polyline format documentation', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ])
  })
})
