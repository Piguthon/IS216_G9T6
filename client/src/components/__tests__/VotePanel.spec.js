// Component tests for VotePanel.vue.

import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import VotePanel from '../VotePanel.vue'

const bishan = { optionId: 'bishan', name: 'Bishan', count: 2 }
const novena = { optionId: 'novena', name: 'Novena', count: 1 }

function mountPanel(props) {
  return mount(VotePanel, {
    props: {
      title: 'Vote for a meeting point',
      finalTitle: 'Meeting point confirmed by the host',
      options: [bishan, novena],
      voterCount: 4,
      ...props,
    },
  })
}

describe('VotePanel', () => {
  it('lists every option with its vote count', () => {
    const wrapper = mountPanel()
    const options = wrapper.findAll('[data-testid="vote-option"]')

    expect(options).toHaveLength(2)
    expect(options[0].text()).toContain('Bishan')
    expect(options[0].text()).toContain('2 votes')
    expect(options[1].text()).toContain('Novena')
    expect(options[1].text()).toContain('1 vote')
  })

  it('shows how many members have voted', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="vote-progress"]').text()).toBe('3 of 4 voted')
  })

  it('emits vote with the option when Vote is pressed', async () => {
    const wrapper = mountPanel()
    await wrapper.findAll('[data-testid="vote-button"]')[1].trigger('click')

    expect(wrapper.emitted('vote')).toBeTruthy()
    expect(wrapper.emitted('vote')[0]).toEqual([novena])
  })

  it('labels my current vote', () => {
    const wrapper = mountPanel({ myVote: 'bishan' })
    const buttons = wrapper.findAll('[data-testid="vote-button"]')

    expect(buttons[0].text()).toBe('Your vote')
    expect(buttons[1].text()).toBe('Vote')
  })

  it('hides Confirm as final from members who are not the host', () => {
    const wrapper = mountPanel({ isHost: false })

    expect(wrapper.find('[data-testid="vote-confirm"]').exists()).toBe(false)
  })

  it('emits confirm with the option when the host confirms it', async () => {
    const wrapper = mountPanel({ isHost: true })
    await wrapper.findAll('[data-testid="vote-confirm"]')[0].trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')[0]).toEqual([bishan])
  })

  it('shows the confirmed option and hides the ballot once the host confirms', () => {
    const wrapper = mountPanel({ final: bishan })

    expect(wrapper.find('[data-testid="vote-title"]').text()).toBe(
      'Meeting point confirmed by the host',
    )
    expect(wrapper.find('[data-testid="vote-final"]').text()).toContain('Bishan')
    expect(wrapper.findAll('[data-testid="vote-option"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="vote-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="vote-progress"]').exists()).toBe(false)
  })

  it('emits leave when a member presses Leave meetup after the host confirms', async () => {
    const wrapper = mountPanel({ final: bishan, canLeave: true })
    await wrapper.find('[data-testid="vote-leave"]').trigger('click')

    expect(wrapper.emitted('leave')).toHaveLength(1)
  })

  it('shows the empty message when there is nothing to vote on', () => {
    const wrapper = mountPanel({ options: [], emptyText: 'No venues yet.' })

    expect(wrapper.find('[data-testid="vote-empty"]').text()).toBe('No venues yet.')
    expect(wrapper.findAll('[data-testid="vote-option"]')).toHaveLength(0)
  })
})
