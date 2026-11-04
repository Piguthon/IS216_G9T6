/* SavedStartPointPicker.spec.js
 Component tests for SavedStartPointPicker.vue (a logged-in member's saved locations in the lobby).
 axios is mocked, so the saved locations are fixed. The tests verify that each saved location is a
 button that emits it as the start point, and when the address search (the slot) is shown.
*/

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import SavedStartPointPicker from '../SavedStartPointPicker.vue'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('../../stores/auth', () => ({ useAuthStore: () => ({ token: 'test-token' }) }))

const savedLocations = [
  {
    _id: 'school',
    label: 'School',
    address: 'School Road',
    postal: '',
    lat: 1.3,
    lng: 103.8,
    isDefault: true,
  },
  {
    _id: 'home',
    label: 'Home',
    address: 'Home Road',
    postal: '123456',
    lat: 1.4,
    lng: 103.9,
  },
]

async function mountPicker(currentStart = null) {
  axios.get.mockResolvedValueOnce({ data: savedLocations })
  const wrapper = mount(SavedStartPointPicker, {
    props: { currentStart },
    slots: { default: '<input data-testid="search" />' },
  })
  await flushPromises()
  return wrapper
}

describe('saved starting point selection', () => {
  it('shows each saved location as a button and applies the clicked one', async () => {
    const wrapper = await mountPicker()
    try {
      const buttons = wrapper.findAll('[data-testid="saved-start-option"]')
      expect(buttons.map((button) => button.text())).toEqual(['School', 'Home'])
      expect(wrapper.emitted('select')).toBeUndefined()
      await buttons[1].trigger('click')
      expect(wrapper.emitted('select')).toEqual([
        [
          {
            label: 'Home Road',
            postal: '123456',
            lat: 1.4,
            lng: 103.9,
          },
        ],
      ])
    } finally {
      wrapper.unmount()
    }
  })

  it('shows the address search until a saved location is the start point', async () => {
    const wrapper = await mountPicker()
    try {
      expect(wrapper.find('[data-testid="search"]').exists()).toBe(true)
      await wrapper.setProps({ currentStart: { lat: 1.4, lng: 103.9 } })
      expect(wrapper.find('[data-testid="search"]').exists()).toBe(false)
      const selected = wrapper.get('[aria-pressed="true"]')
      expect(selected.text()).toBe('Home')
    } finally {
      wrapper.unmount()
    }
  })

  it('keeps the address search when the start point is not a saved location', async () => {
    const wrapper = await mountPicker({ lat: 1.5, lng: 104 })
    try {
      expect(wrapper.find('[data-testid="search"]').exists()).toBe(true)
      expect(wrapper.find('[aria-pressed="true"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('brings the address search back with Use a different address', async () => {
    const wrapper = await mountPicker({ lat: 1.3, lng: 103.8 })
    try {
      await wrapper.get('[data-testid="saved-start-other"]').trigger('click')
      expect(wrapper.find('[data-testid="search"]').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })
})
