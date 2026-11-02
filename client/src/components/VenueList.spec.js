import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import axios from 'axios'
import { createPinia } from 'pinia'
import VenueList from './VenueList.vue'

vi.mock('axios')

function venues(count) {
  const list = []
  for (let i = 0; i < count; i++) {
    list.push({ venueKey: `v${i}`, name: `Place ${i}`, category: 'catering.cafe', distanceM: 100 })
  }
  return list
}

async function mountList(count) {
  axios.get.mockResolvedValue({ data: venues(count) })
  const wrapper = mount(VenueList, {
    props: { lat: 1.35, lng: 103.85 },
    global: {
      plugins: [createPinia()],
      stubs: { VenueCard: { template: '<div class="venue-stub"></div>' } },
    },
  })
  await flushPromises()
  return wrapper
}

describe('VenueList', () => {
  it('shows six places first, and the rest after Show more places', async () => {
    const wrapper = await mountList(8)
    expect(wrapper.findAll('.venue-stub')).toHaveLength(6)
    expect(wrapper.get('[data-testid="venue-show-more"]').text()).toContain('(2)')

    await wrapper.get('[data-testid="venue-show-more"]').trigger('click')
    expect(wrapper.findAll('.venue-stub')).toHaveLength(8)
    expect(wrapper.find('[data-testid="venue-show-more"]').exists()).toBe(false)
  })

  it('hides the button when every place already fits', async () => {
    const wrapper = await mountList(6)
    expect(wrapper.findAll('.venue-stub')).toHaveLength(6)
    expect(wrapper.find('[data-testid="venue-show-more"]').exists()).toBe(false)
  })
})
