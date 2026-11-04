// e2e/lobby.spec.js
// Journey: in the lobby, each member sets a start point and how they're travelling, then
// confirms their location. The host can only work out the fair meeting points once every
// member has confirmed.

import { test, expect } from '@playwright/test'
import {
  hostMeetup,
  joinAsGuest,
  stubAddressSearch,
  setStartPoint,
  confirmLocation,
} from './helpers.js'

test.describe('Meetup lobby', () => {
  test.beforeEach(async ({ page }) => {
    await stubAddressSearch(page)
  })

  test('should set a start point, switch to car and confirm the location', async ({ page }) => {
    // Setup: a host in the lobby of a new meetup
    await hostMeetup(page)
    const me = page.getByTestId('member-item').filter({ hasText: '(you)' })
    await expect(me.getByTestId('member-waiting')).toBeVisible()

    // Action: choose SMU as the start point
    await setStartPoint(page, '178902')

    // Assert: the member list shows the start point
    await expect(me.getByTestId('member-start')).toContainText('SMU SCHOOL OF COMPUTING')

    // Action: switch the travel mode to car
    await page.getByTestId('travel-mode-car').click()

    // Assert: car is pressed and the member list shows "car"
    await expect(page.getByTestId('travel-mode-car')).toHaveAttribute('aria-pressed', 'true')
    await expect(me.getByTestId('member-car')).toBeVisible()

    // Action and assert: confirm the location
    await confirmLocation(page)
    await expect(me.getByTestId('member-waiting')).toBeHidden()
  })

  test('should show the host See fair meeting points only once both members have confirmed', async ({
    page,
    browser,
  }) => {
    // Setup: a host who has confirmed their start point
    const { code } = await hostMeetup(page)
    await setStartPoint(page, '178902')
    await confirmLocation(page)

    // Assert: on their own, the host cannot work out the meeting points yet
    await expect(page.getByTestId('lobby-results-link')).toBeHidden()
    await expect(page.getByTestId('lobby-start-warning')).toHaveText(
      'Results open once someone else joins.',
    )

    // Action: a guest joins but has not confirmed
    const guestPage = await joinAsGuest(browser, code, 'Elliot')
    await expect(page.getByTestId('member-item')).toHaveCount(2, { timeout: 10000 })

    // Assert: still no results link while the guest is waiting
    await expect(page.getByTestId('lobby-start-warning')).toContainText(
      'once everyone has confirmed their location',
    )
    await expect(page.getByTestId('lobby-results-link')).toBeHidden()

    // Action: the guest sets a start point and confirms
    await setStartPoint(guestPage, 'Tampines MRT')
    await confirmLocation(guestPage)

    // Assert: the host's lobby (polling every 5 seconds) now offers the results
    await expect(page.getByTestId('lobby-results-link')).toHaveText('See fair meeting points', {
      timeout: 10000,
    })

    await guestPage.context().close()
  })
})
