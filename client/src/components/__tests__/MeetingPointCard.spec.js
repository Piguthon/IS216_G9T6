// Component tests for MeetingPointCard.vue.

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MeetingPointCard from '../MeetingPointCard.vue'

const bishan = {
  stationId: 'NS17',
  name: 'Bishan',
  type: 'mrt',
  longestMinutes: 34,
  totalMinutes: 61,
  times: [
    { memberId: 'm1', name: 'Alice', minutes: 27, travelMode: 'transit' },
    { memberId: 'm2', name: 'Bob', minutes: 34, travelMode: 'car' },
  ],
}

describe('MeetingPointCard', () => {
  it('shows the rank, name and longest trip in minutes', () => {
    const wrapper = mount(MeetingPointCard, { props: { point: bishan, rank: 1 } })

    expect(wrapper.text()).toContain('Rank 1')
    expect(wrapper.text()).toContain('Bishan')
    expect(wrapper.text()).toContain('34')
    expect(wrapper.text()).toContain('min longest')
  })

  it('labels an MRT station and a bus interchange', () => {
    const station = mount(MeetingPointCard, { props: { point: bishan, rank: 1 } })
    const interchange = mount(MeetingPointCard, {
      props: { point: { ...bishan, type: 'interchange', name: 'Toa Payoh Int' }, rank: 2 },
    })

    expect(station.text()).toContain('MRT station')
    expect(interchange.text()).toContain('Bus interchange')
  })

  it('emits select with the station id when clicked', async () => {
    const wrapper = mount(MeetingPointCard, { props: { point: bishan, rank: 1 } })
    await wrapper.find('[data-testid="meeting-point-card"]').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual(['NS17'])
  })

  it('hides the members trips when not selected', () => {
    const wrapper = mount(MeetingPointCard, { props: { point: bishan, rank: 1 } })

    expect(wrapper.findAll('[data-testid="meeting-point-time"]')).toHaveLength(0)
  })

  it('lists every members trip, slowest first, when selected', () => {
    const wrapper = mount(MeetingPointCard, {
      props: { point: bishan, rank: 1, selected: true },
    })
    const trips = wrapper.findAll('[data-testid="meeting-point-time"]')

    expect(trips).toHaveLength(2)
    expect(trips[0].text()).toContain('Bob')
    expect(trips[0].text()).toContain('34')
    expect(trips[0].text()).toContain('car')
    expect(trips[1].text()).toContain('Alice')
    expect(trips[1].text()).toContain('27')
    expect(trips[1].text()).toContain('public transport')
  })

  it('shows Confirmed only once the host confirms the point', () => {
    const plain = mount(MeetingPointCard, { props: { point: bishan, rank: 1 } })
    const confirmed = mount(MeetingPointCard, {
      props: { point: bishan, rank: 1, confirmed: true },
    })

    expect(plain.text()).not.toContain('Confirmed')
    expect(confirmed.text()).toContain('Confirmed')
  })
})
