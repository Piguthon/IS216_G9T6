// OWNER: JX. Week 10 component tests: observable bus arrival states and refresh.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import BusArrivalCard from '../BusArrivalCard.vue'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

let wrapper
afterEach(() => {
  if (wrapper) wrapper.unmount()
  vi.clearAllMocks()
})

const bus7 = { stopCode: '01059', stopName: 'BUGIS STN EXIT B', serviceNo: '7' }

function render(buses = [bus7]) {
  wrapper = mount(BusArrivalCard, { props: { buses } })
  return wrapper
}

describe('BusArrivalCard', () => {
  it('shows loading and disables refresh until the request completes', async () => {
    let finish
    axios.get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    render()
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Loading bus arrivals')
    expect(wrapper.get('button').element.disabled).toBe(true)
    finish({ data: { services: [] } })
    await flushPromises()
    expect(wrapper.get('button').element.disabled).toBe(false)
  })

  it('shows the bus stop, bus number and waiting times', async () => {
    const now = Date.now()
    axios.get.mockResolvedValueOnce({
      data: {
        services: [
          {
            serviceNo: '7',
            nextArrivals: [
              new Date(now + 299000).toISOString(),
              new Date(now - 60000).toISOString(),
            ],
          },
        ],
      },
    })
    render()
    await flushPromises()
    const row = wrapper.get('[data-testid="bus-arrival-row"]').text()
    expect(row).toContain('BUGIS STN EXIT B (01059)')
    expect(row).toContain('7')
    expect(row).toContain('5 min')
    expect(row).toContain('Arriving')
  })

  it('only shows the buses in the route, not others at the stop', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        services: [
          { serviceNo: '7', nextArrivals: [] },
          { serviceNo: '12', nextArrivals: [new Date(Date.now() + 60000).toISOString()] },
        ],
      },
    })
    render()
    await flushPromises()
    expect(wrapper.findAll('[data-testid="bus-arrival-row"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('12')
    expect(wrapper.text()).toContain('No upcoming arrivals')
  })

  it('shows a row for each bus and loads each stop once', async () => {
    axios.get.mockResolvedValue({ data: { services: [] } })
    render([
      bus7,
      { ...bus7, serviceNo: '12' },
      { stopCode: '24009', stopName: 'JOO KOON INT', serviceNo: '99' },
    ])
    await flushPromises()
    expect(wrapper.findAll('[data-testid="bus-arrival-row"]')).toHaveLength(3)
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('shows no upcoming arrivals when the bus is not running', async () => {
    axios.get.mockResolvedValueOnce({ data: { services: [] } })
    render()
    await flushPromises()
    expect(wrapper.text()).toContain('No upcoming arrivals')
  })

  it('shows the API error and lets the user retry successfully', async () => {
    axios.get
      .mockRejectedValueOnce({ response: { data: { error: 'Please try again.' } } })
      .mockResolvedValueOnce({ data: { services: [{ serviceNo: '7', nextArrivals: [] }] } })
    render()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Please try again.')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="bus-arrival-row"]').exists()).toBe(true)
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('shows a fallback error for a network failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('Network unavailable'))
    render()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to load bus arrivals.')
  })
})
