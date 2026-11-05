// Integration tests for JoinMeetupView.vue with the router, the auth store and a mocked axios.

import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'
import { BASE_URL } from '../../config'
import JoinMeetupView from '../../views/JoinMeetupView.vue'

vi.mock('axios')

let router

async function mountJoin() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/join', component: JoinMeetupView },
      { path: '/create', component: { template: '<div />' } },
      { path: '/meetup/:code', component: { template: '<div />' } },
    ],
  })
  router.push('/join')
  await router.isReady()
  return mount(JoinMeetupView, { global: { plugins: [router, createPinia()] } })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('JoinMeetupView integration', () => {
  it('asks for the code and name when they are empty', async () => {
    const wrapper = await mountJoin()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[data-testid="join-error"]').text()).toBe(
      'Please fill out all fields to join the meetup.',
    )
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('shows a message when no meetup has that code', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 404 } })
    const wrapper = await mountJoin()
    await wrapper.find('[data-testid="join-code"]').setValue('ZZZZZZ')
    await wrapper.find('[data-testid="join-name"]').setValue('Bob')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="join-error"]').text()).toBe(
      'No meetup with that code was found.',
    )
    expect(router.currentRoute.value.path).toBe('/join')
  })

  it('saves my member id and opens the lobby after joining', async () => {
    axios.post.mockResolvedValueOnce({
      data: { _id: 'm2', name: 'Bob', start: null, memberToken: 'bob-secret' },
    })
    const wrapper = await mountJoin()
    await wrapper.find('[data-testid="join-code"]').setValue('abc123')
    await wrapper.find('[data-testid="join-name"]').setValue('Bob')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      `${BASE_URL}/meetups/ABC123/members`,
      { name: 'Bob' },
      { headers: {} },
    )
    expect(localStorage.getItem('fairspot-member-ABC123')).toBe('m2')
    expect(localStorage.getItem('fairspot-member-token-ABC123')).toBe('bob-secret')
    expect(router.currentRoute.value.path).toBe('/meetup/ABC123')
    expect(wrapper.find('[data-testid="join-error"]').exists()).toBe(false)
  })

  it('shows the server message when the name is already taken', async () => {
    const taken = 'Someone in this meetup already uses that name. Choose another name.'
    axios.post.mockRejectedValueOnce({ response: { status: 409, data: { error: taken } } })
    const wrapper = await mountJoin()
    await wrapper.find('[data-testid="join-code"]').setValue('ABC123')
    await wrapper.find('[data-testid="join-name"]').setValue('Bob')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="join-error"]').text()).toBe(taken)
    expect(router.currentRoute.value.path).toBe('/join')
  })

  it('sends my saved memberToken when I rejoin', async () => {
    localStorage.setItem('fairspot-member-token-ABC123', 'bob-secret')
    axios.post.mockResolvedValueOnce({ data: { _id: 'm2', name: 'Bob', start: null } })
    const wrapper = await mountJoin()
    await wrapper.find('[data-testid="join-code"]').setValue('ABC123')
    await wrapper.find('[data-testid="join-name"]').setValue('Bob')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      `${BASE_URL}/meetups/ABC123/members`,
      { name: 'Bob' },
      { headers: { 'X-Member-Token': 'bob-secret' } },
    )
    expect(localStorage.getItem('fairspot-member-token-ABC123')).toBe('bob-secret')
    expect(router.currentRoute.value.path).toBe('/meetup/ABC123')
  })
})
