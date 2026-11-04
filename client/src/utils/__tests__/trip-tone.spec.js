/* trip-tone.spec.js
 Unit tests for utils/trip-tone.js: the longest trip is red, the shortest green, the rest amber.
*/

import { describe, it, expect } from 'vitest'
import { tripTone } from '../trip-tone'

describe('tripTone', () => {
  it('marks the longest trip red, the shortest green and the rest amber', () => {
    expect(tripTone(34, 34, 27)).toBe('is-red')
    expect(tripTone(27, 34, 27)).toBe('is-green')
    expect(tripTone(30, 34, 27)).toBe('is-amber')
  })

  it('marks every trip green when they are all the same length', () => {
    expect(tripTone(30, 30, 30)).toBe('is-green')
  })
})
