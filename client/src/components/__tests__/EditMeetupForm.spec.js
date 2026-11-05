// Component tests for EditMeetupForm.vue.

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
  it('fills the fields with the current details', () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })

    expect(wrapper.find('[data-testid="edit-occasion"]').element.value).toBe('Dinner')
    expect(wrapper.find('[data-testid="edit-date"]').element.value).toBe('2026-11-20')
    expect(wrapper.find('[data-testid="edit-time"]').element.value).toBe('19:00')
  })

  it('shows an error and does not save when a field is empty', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-occasion"]').setValue('')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Please fill in all fields.')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

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

  it('rejects a date before today', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-11-03')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Choose today or a future date.')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('accepts today as the date', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-11-04')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0].date).toBe('2026-11-04')
  })

  it('rejects a time today that has already passed', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-date"]').setValue('2026-11-04')
    await wrapper.find('[data-testid="edit-time"]').setValue('11:30')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('That time has already passed. Choose a later time.')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('emits cancel when Cancel is pressed', async () => {
    const wrapper = mount(EditMeetupForm, { props: { meetup } })
    await wrapper.find('[data-testid="edit-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('save')).toBeFalsy()
  })
})
