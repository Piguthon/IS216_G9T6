/* CreateMeetupIntegration.spec.js
 Integration tests for CreateMeetupView.vue with the router, the Pinia auth store and a
 mocked axios (vi.mock), so no server is needed.

   the host fills in the occasion, date and time and submits
       ↓
   CreateMeetupView sends POST /meetups
       ↓
   the page swaps the form for the new meetup's code and a "Go to meetup" button

 The tests verify:
   1. An empty form shows a message and sends nothing
   2. A successful POST shows the 6-character code and remembers the host's member id and
      memberToken
   3. "Go to meetup" opens the lobby for that code
   4. The server's error message is shown when the POST fails

 The clock is fixed (only Date is faked) so "today" is always 4 Nov 2026.
*/

import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import axios from 'axios'
import { BASE_URL } from '../../config'
import CreateMeetupView from '../../views/CreateMeetupView.vue'

vi.mock('axios')

const created = {
  code: 'QWE789',
  hostName: 'Alice',
  occasion: 'Project dinner',
  date: '2026-11-20',
  time: '19:00',
  members: [{ _id: 'host-1', name: 'Alice', start: null }],
  memberToken: 'host-secret',
}

let router

async function mountCreate() {
  axios.get.mockResolvedValue({ data: [] }) // nobody to suggest under "people you often meet"
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/create', component: CreateMeetupView },
      { path: '/login', component: { template: '<div />' } },
      { path: '/meetup/:code', component: { template: '<div />' } },
    ],
  })
  router.push('/create')
  await router.isReady()
  const wrapper = mount(CreateMeetupView, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

async function fillForm(wrapper) {
  await wrapper.find('[data-testid="create-occasion"]').setValue('Project dinner')
  await wrapper.find('[data-testid="create-date"]').setValue('2026-11-20')
  await wrapper.find('[data-testid="create-time"]').setValue('19:00')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-04T12:00:00+08:00'))
  localStorage.clear()
  localStorage.setItem('fairspot-token', 'test-token') // /create is for logged-in hosts
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('CreateMeetupView integration', () => {
  // Verify that an empty form is stopped before anything is sent.
  it('shows a message and sends nothing when the form is empty', async () => {
    const wrapper = await mountCreate()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[data-testid="create-error"]').text()).toBe(
      'Please fill out all fields to create your meetup.',
    )
    expect(axios.post).not.toHaveBeenCalled()
  })

  // Verify that a successful POST shows the new code and remembers the host.
  it('shows the new 6-character code after the meetup is created', async () => {
    axios.post.mockResolvedValueOnce({ data: created })
    const wrapper = await mountCreate()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      `${BASE_URL}/meetups`,
      { occasion: 'Project dinner', date: '2026-11-20', time: '19:00', memberUserIds: [] },
      { headers: { Authorization: 'Bearer test-token' } },
    )
    const code = wrapper.find('[data-testid="create-code"]').text()
    expect(code).toBe('QWE789')
    expect(code).toHaveLength(6)
    expect(wrapper.find('[data-testid="create-result"]').text()).toContain('Project dinner')
    expect(localStorage.getItem('fairspot-member-QWE789')).toBe('host-1')
    expect(localStorage.getItem('fairspot-member-token-QWE789')).toBe('host-secret')
  })

  // Verify that "Go to meetup" opens the new meetup's lobby.
  it('opens the lobby when Go to meetup is pressed', async () => {
    axios.post.mockResolvedValueOnce({ data: created })
    const wrapper = await mountCreate()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    await wrapper.find('[data-testid="create-go-to-meetup"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/meetup/QWE789')
  })

  // Edge case: the server refuses the meetup, so its message is shown and the form stays.
  it('shows the server error message when the meetup cannot be created', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 400, data: { error: 'Choose today or a future date.' } },
    })
    const wrapper = await mountCreate()
    await fillForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="create-error"]').text()).toBe(
      'Choose today or a future date.',
    )
    expect(wrapper.find('[data-testid="create-code"]').exists()).toBe(false)
  })
})
