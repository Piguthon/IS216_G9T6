// OWNER: JX. Week 10 component tests: observable bus arrival states and refresh.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import BusArrivalCard from './BusArrivalCard.vue'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

let wrapper
afterEach(() => {
  if (wrapper) wrapper.unmount()
  vi.clearAllMocks()
})

function render() {
  wrapper = mount(BusArrivalCard, { props: { stopCode: '01059' } })
  return wrapper
}

describe('BusArrivalCard', () => {
  it('shows loading and disables refresh until the request completes', async () => {
    let finish
    axios.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    render()
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Loading bus arrivals')
    expect(wrapper.get('button').element.disabled).toBe(true)
    finish({ data: { services: [] } })
    await flushPromises()
    expect(wrapper.get('button').element.disabled).toBe(false)
  })

  it('shows arrival minutes, arriving buses and services without predictions', async () => {
    const now = Date.now()
    axios.get.mockResolvedValueOnce({ data: { services: [
      { serviceNo: '7', nextArrivals: [new Date(now + 299000).toISOString(), new Date(now - 60000).toISOString()] },
      { serviceNo: '12', nextArrivals: [] },
    ] } })
    render()
    await flushPromises()
    expect(wrapper.text()).toContain('Bus 7')
    expect(wrapper.text()).toContain('5 min')
    expect(wrapper.text()).toContain('Arriving')
    expect(wrapper.text()).toContain('No upcoming arrivals')
  })

  it('shows the empty state when no services are returned', async () => {
    axios.get.mockResolvedValueOnce({ data: { services: [] } })
    render()
    await flushPromises()
    expect(wrapper.text()).toContain('No bus services are available right now.')
  })

  it('shows the API error and lets the user retry successfully', async () => {
    axios.get.mockRejectedValueOnce({ response: { data: { error: 'Please try again.' } } })
      .mockResolvedValueOnce({ data: { services: [{ serviceNo: '7', nextArrivals: [] }] } })
    render()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Please try again.')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Bus 7')
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('shows a fallback error for a network failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network unavailable'))
    render()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to load bus arrivals.')
  })
})
