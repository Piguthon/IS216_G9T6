// End-to-end tests for setting a start point and travel mode, then confirming, in the lobby.

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
    await hostMeetup(page)
    const me = page.getByTestId('member-item').filter({ hasText: '(you)' })
    await expect(me.getByTestId('member-waiting')).toBeVisible()

    await setStartPoint(page, '178902')

    await expect(me.getByTestId('member-start')).toContainText('SMU SCHOOL OF COMPUTING')

    await page.getByTestId('travel-mode-car').click()

    await expect(page.getByTestId('travel-mode-car')).toHaveAttribute('aria-pressed', 'true')
    await expect(me.getByTestId('member-car')).toBeVisible()

    await confirmLocation(page)
    await expect(me.getByTestId('member-waiting')).toBeHidden()
  })

  test('should show the host See fair meeting points only once both members have confirmed', async ({
    page,
    browser,
  }) => {
    const { code } = await hostMeetup(page)
    await setStartPoint(page, '178902')
    await confirmLocation(page)

    await expect(page.getByTestId('lobby-results-link')).toBeHidden()
    await expect(page.getByTestId('lobby-start-warning')).toHaveText(
      'Results open once someone else joins.',
    )

    const guestPage = await joinAsGuest(browser, code, 'Elliot')
    await expect(page.getByTestId('member-item')).toHaveCount(2, { timeout: 10000 })

    await expect(page.getByTestId('lobby-start-warning')).toContainText(
      'once everyone has confirmed their location',
    )
    await expect(page.getByTestId('lobby-results-link')).toBeHidden()

    await setStartPoint(guestPage, 'Tampines MRT')
    await confirmLocation(guestPage)

    await expect(page.getByTestId('lobby-results-link')).toHaveText('See fair meeting points', {
      timeout: 10000,
    })

    await guestPage.context().close()
  })
})
