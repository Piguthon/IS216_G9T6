import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import SavedStartPointPicker from './SavedStartPointPicker.vue'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ token: 'test-token' }) }))

describe('saved starting point selection', () => {
  it('only applies the selected address after Use is clicked', async () => {
    axios.get.mockResolvedValueOnce({
      data: [
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
      ],
    })
    const wrapper = mount(SavedStartPointPicker)
    try {
      await flushPromises()
      expect(wrapper.get('select').element.value).toBe('school')
      expect(wrapper.emitted('select')).toBeUndefined()
      await wrapper.get('select').setValue('home')
      expect(wrapper.emitted('select')).toBeUndefined()
      await wrapper.get('button').trigger('click')
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
})
