/* EditMeetupForm.spec.js
 Component tests for EditMeetupForm.vue (the host's form for changing a meetup's details).
 The component receives the meetup via props &:
   1. Starts with the meetup's current occasion, date and time
   2. Shows an error and emits nothing when a field is empty
   3. Rejects a date before today, but accepts today
   4. Emits "save" with the new values when every field is valid
   5. Emits "cancel" when the host presses Cancel

 The clock is fixed (vi.useFakeTimers with only Date faked), so "today" is always
 4 Nov 2026 in Singapore and the tests never depend on the real date.
*/

import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import EditMeetupForm from '../EditMeetupForm.vue'

const meetup = { code: 'ABC123', occasion: 'Dinner', date: '2026-11-20', time: '19:00' }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-04T12:00:00+08:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('EditMeetupForm', () => {
  // Verify that the form starts with the meetup's current details.
  it('fills the fields with the current details', () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })

    expect(wrapper.find('[data-testid="edit-occasion"]').element.value).toBe('Dinner')
    expect(wrapper.find('[data-testid="edit-date"]').element.value).toBe('2026-11-20')
    expect(wrapper.find('[data-testid="edit-time"]').element.value).toBe('19:00')
  })

  // Verify that an empty field shows an error and nothing is saved.
  it('shows an error and does not save when a field is empty', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-occasion"]').setValue('')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Please fill in all fields.')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  // Verify that valid details are sent to the parent.
  it('emits save with the new occasion, date and time', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-occasion"]').setValue('Lunch')
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-12-01')
    await wrapper.find('[data-testid="edit-time"]').setValue('12:30')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeTruthy()
    expect(wrapper.emitted('save')[0]).toEqual([
      { occasion: 'Lunch', date: '2026-12-01', time: '12:30' },
    ])
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  // Edge case: yesterday is in the past, so it is rejected.
  it('rejects a date before today', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-11-03')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Choose today or a future date.')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  // Edge case: today itself is on the boundary and is allowed.
  it('accepts today as the date', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-11-04')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0].date).toBe('2026-11-04')
  })

  // Verify that Cancel tells the parent to close the form.
  it('emits cancel when Cancel is pressed', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeFalsy()
  })
})
