/* TravelModePicker.spec.js
 Component tests for TravelModePicker.vue (how a member is getting to the meetup).
 The component receives the current mode via props &:
   1. Shows one button per travel mode (public transport and car)
   2. Marks the current mode as pressed (aria-pressed), which screen readers announce
   3. Emits "select" with the mode the member presses
*/

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TravelModePicker from '../TravelModePicker.vue'

describe('TravelModePicker', () => {
  // Verify that both travel modes are offered.
  it('shows a button for public transport and one for car', () => {
    const wrapper = mount(TravelModePicker)
    const buttons = wrapper.findAll('button')

    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('Public transport')
    expect(buttons[1].text()).toBe('Car')
  })

  // Verify that public transport is pressed by default.
  it('presses public transport when no mode is given', () => {
    const wrapper = mount(TravelModePicker)

    expect(wrapper.find('[data-testid="travel-mode-transit"]').attributes('aria-pressed')).toBe(
      'true',
    )
    expect(wrapper.find('[data-testid="travel-mode-car"]').attributes('aria-pressed')).toBe('false')
  })

  // Verify that the pressed button follows the currentMode prop.
  it('presses car when the current mode is car', () => {
    const wrapper = mount(TravelModePicker, { props: { currentMode: 'car' } })

    expect(wrapper.find('[data-testid="travel-mode-car"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-testid="travel-mode-transit"]').attributes('aria-pressed')).toBe(
      'false',
    )
  })

  // Verify that choosing a mode tells the parent which one was chosen.
  it('emits select with car when Car is pressed', async () => {
    const wrapper = mount(TravelModePicker)
    await wrapper.find('[data-testid="travel-mode-car"]').trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')[0]).toEqual(['car'])
  })

  // Verify that pressing public transport emits transit.
  it('emits select with transit when Public transport is pressed', async () => {
    const wrapper = mount(TravelModePicker, { props: { currentMode: 'car' } })
    await wrapper.find('[data-testid="travel-mode-transit"]').trigger('click')

    expect(wrapper.emitted('select')[0]).toEqual(['transit'])
  })
})
