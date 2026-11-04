/* MemberList.spec.js
 Component tests for MemberList.vue (the lobby's list of members).
 The component receives the members, "my" member id and the host's id via props &:
   1. Shows each member's name and start point
   2. Marks me with "(you)" and the host with "(host)"
   3. Shows "waiting" until a member confirms their location
   4. Shows how each member is travelling (car or public transport)
   5. Shows Remove only to the host, never on the host's own row, and emits the member
*/

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import MemberList from '../MemberList.vue'

const host = {
  _id: 'host-1',
  name: 'Alice',
  start: { label: 'SMU', postal: '178902', lat: 1.297, lng: 103.849 },
  travelMode: 'transit',
  ready: true,
}
const guest = { _id: 'guest-1', name: 'Bob', start: null, travelMode: 'car', ready: false }

function mountList(props) {
  return mount(MemberList, {
    props: { members: [host, guest], hostId: 'host-1', ...props },
  })
}

describe('MemberList', () => {
  // Verify that every member is listed with their start point.
  it('lists every member with their start point', () => {
    const wrapper = mountList()
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Alice')
    expect(items[0].text()).toContain('SMU')
    expect(items[1].text()).toContain('Bob')
  })

  // Verify that "(you)" appears only next to the member viewing the page.
  it('marks the current member with (you)', () => {
    const wrapper = mountList({ currentMemberId: 'guest-1' })
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items[1].text()).toContain('(you)')
    expect(items[0].text()).not.toContain('(you)')
  })

  // Verify that "(host)" appears only next to the host.
  it('marks the host with (host)', () => {
    const wrapper = mountList()
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items[0].text()).toContain('(host)')
    expect(items[1].text()).not.toContain('(host)')
  })

  // Verify that a member who has not confirmed their location shows "waiting".
  it('shows waiting until a member confirms their location', () => {
    const wrapper = mountList()
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items[0].find('[data-testid="member-waiting"]').exists()).toBe(false)
    expect(items[1].find('[data-testid="member-waiting"]').exists()).toBe(true)
  })

  // Verify that each member's travel mode is shown.
  it('shows car for drivers and public transport for everyone else', () => {
    const wrapper = mountList()
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items[0].text()).toContain('public transport')
    expect(items[1].text()).toContain('car')
  })

  // Verify that a member who is not the host cannot remove anyone.
  it('hides Remove when the viewer is not the host', () => {
    const wrapper = mountList({ canRemove: false })

    expect(wrapper.findAll('[data-testid="member-remove"]')).toHaveLength(0)
  })

  // Verify that the host can remove everyone except themselves.
  it('shows Remove to the host on every row except their own', () => {
    const wrapper = mountList({ canRemove: true })
    const items = wrapper.findAll('[data-testid="member-item"]')

    expect(items[0].find('[data-testid="member-remove"]').exists()).toBe(false)
    expect(items[1].find('[data-testid="member-remove"]').exists()).toBe(true)
  })

  // Verify that pressing Remove tells the parent which member to remove.
  it('emits remove with the member when the host presses Remove', async () => {
    const wrapper = mountList({ canRemove: true })
    await wrapper.find('[data-testid="member-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
    expect(wrapper.emitted('remove')[0]).toEqual([guest])
  })

  // Edge case: an empty meetup renders no rows.
  it('renders no rows when there are no members', () => {
    const wrapper = mountList({ members: [] })

    expect(wrapper.findAll('[data-testid="member-item"]')).toHaveLength(0)
  })
})
