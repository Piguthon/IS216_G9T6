// Component tests for TravelModePicker.vue.

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TravelModePicker from '../TravelModePicker.vue'

describe('TravelModePicker', () => {
  it('shows a button for public transport and one for car', () => {
    const wrapper = mount(TravelModePicker)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('Public transport')
    expect(buttons[1].text()).toBe('Car')
  })

  it('presses public transport when no mode is given', () => {
    const wrapper = mount(TravelModePicker)

    expect(wrapper.find('[data-testid="travel-mode-transit"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.find('[data-testid="travel-mode-car"]').attributes('aria-pressed')).toBe('false')
  })

  it('presses car when the current mode is car', () => {
    const wrapper = mount(TravelModePicker, { props: { currentMode: 'car' } })

    expect(wrapper.find('[data-testid="travel-mode-car"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="travel-mode-transit"]').attributes('aria-pressed')).toBe(
      'false',
    )
  })

  it('emits select with car when Car is pressed', async () => {
    const wrapper = mount(TravelModePicker)
    await wrapper.find('[data-testid="travel-mode-car"]').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual(['car'])
  })

  it('emits select with transit when Public transport is pressed', async () => {
    const wrapper = mount(TravelModePicker, { props: { currentMode: 'car' } })
    await wrapper.find('[data-testid="travel-mode-transit"]').trigger('click')

    expect(wrapper.emitted('select')[0]).toEqual(['transit'])
  })
})
