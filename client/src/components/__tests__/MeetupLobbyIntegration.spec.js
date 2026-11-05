// Integration tests for MeetupLobbyView.vue with its real child components and a mocked axios.

import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'
import { BASE_URL } from '../../config'
import MeetupLobbyView from '../../views/MeetupLobbyView.vue'

vi.mock('axios')

const smu = { label: 'SMU', postal: '178902', lat: 1.297, lng: 103.849 }

function makeMeetup(members) {
  return {
    code: 'ABC123',
    hostName: 'Alice',
    occasion: 'Project dinner',
    date: '2026-11-20',
    time: '19:00',
    rankedAt: null,
    finalStation: null,
    leftSinceRanking: [],
    members,
  }
}

function member(id, name, extra) {
  return { _id: id, name, start: null, travelMode: 'transit', ready: false, ...extra }
}

let wrapper

// Mounts the real lobby at /meetup/ABC123 as the guest member with id myId
async function mountLobby(myId) {
  localStorage.setItem('fairspot-member-ABC123', myId)
  localStorage.setItem('fairspot-member-token-ABC123', `secret-${myId}`)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/join', component: { template: '<div />' } },
      { path: '/meetup/:code', component: MeetupLobbyView },
      { path: '/meetup/:code/:page', component: { template: '<div />' } },
    ],
  })
  router.push('/meetup/ABC123')
  await router.isReady()
  wrapper = mount(MeetupLobbyView, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  wrapper.unmount()
  vi.clearAllMocks()
})

describe('MeetupLobbyView integration', () => {
  it('shows the meetup, its members and the travel mode buttons', async () => {
    axios.get.mockResolvedValue({
      data: makeMeetup([member('m1', 'Alice'), member('m2', 'Bob')]),
    })
    await mountLobby('m2')

    expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/meetups/ABC123`, {
      headers: { 'X-Member-Token': 'secret-m2' },
    })
    expect(wrapper.find('[data-testid="lobby-occasion"]').text()).toBe('Project dinner')
    expect(wrapper.find('[data-testid="lobby-code"]').text()).toBe('ABC123')

    const items = wrapper.findAll('[data-testid="member-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('(host)')
    expect(items[1].text()).toContain('(you)')

    expect(wrapper.find('[data-testid="travel-mode-transit"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="travel-mode-car"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lobby-confirm-location"]').element.disabled).toBe(true)
  })

  it('sends the new travel mode and shows it once saved', async () => {
    axios.get.mockResolvedValueOnce({
      data: makeMeetup([member('m1', 'Alice'), member('m2', 'Bob')]),
    })
    axios.put.mockResolvedValueOnce({ data: {} })
    axios.get.mockResolvedValueOnce({
      data: makeMeetup([member('m1', 'Alice'), member('m2', 'Bob', { travelMode: 'car' })]),
    })
    await mountLobby('m2')

    await wrapper.find('[data-testid="travel-mode-car"]').trigger('click')
    await flushPromises()

    expect(axios.put).toHaveBeenCalledWith(
      `${BASE_URL}/meetups/ABC123/me/mode`,
      { travelMode: 'car' },
      { headers: { 'X-Member-Token': 'secret-m2' } },
    )
    const items = wrapper.findAll('[data-testid="member-item"]')
    expect(items[1].find('[data-testid="member-car"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="travel-mode-car"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Your trip times include 10 minutes to park')
  })

  it('confirms my location and shows Location confirmed', async () => {
    axios.get.mockResolvedValueOnce({
      data: makeMeetup([member('m1', 'Alice'), member('m2', 'Bob', { start: smu })]),
    })
    axios.put.mockResolvedValueOnce({ data: {} })
    axios.get.mockResolvedValueOnce({
      data: makeMeetup([member('m1', 'Alice'), member('m2', 'Bob', { start: smu, ready: true })]),
    })
    await mountLobby('m2')

    await wrapper.find('[data-testid="lobby-confirm-location"]').trigger('click')
    await flushPromises()

    expect(axios.put).toHaveBeenCalledWith(
      `${BASE_URL}/meetups/ABC123/me/ready`,
      { ready: true },
      { headers: { 'X-Member-Token': 'secret-m2' } },
    )
    expect(wrapper.find('[data-testid="lobby-confirmed"]').text()).toContain('Location confirmed.')
    expect(wrapper.find('[data-testid="lobby-confirm-location"]').exists()).toBe(false)
  })

  it('shows the host the results link only once every member has confirmed', async () => {
    axios.get.mockResolvedValueOnce({
      data: makeMeetup([
        member('m1', 'Alice', { start: smu, ready: true }),
        member('m2', 'Bob', { start: smu, ready: false }),
      ]),
    })
    await mountLobby('m1')

    expect(wrapper.find('[data-testid="lobby-results-link"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="lobby-start-warning"]').text()).toContain(
      'once everyone has confirmed their location',
    )
    wrapper.unmount()

    axios.get.mockResolvedValueOnce({
      data: makeMeetup([
        member('m1', 'Alice', { start: smu, ready: true }),
        member('m2', 'Bob', { start: smu, ready: true }),
      ]),
    })
    await mountLobby('m1')

    expect(wrapper.find('[data-testid="lobby-results-link"]').text()).toBe(
      'See fair meeting points',
    )
  })

  it('shows the not-found message for an unknown code', async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } })
    await mountLobby('m1')

    expect(wrapper.find('[data-testid="lobby-error"]').text()).toBe(
      'No meetup with code ABC123 was found.',
    )
    expect(wrapper.find('[data-testid="member-list"]').exists()).toBe(false)
  })
})
