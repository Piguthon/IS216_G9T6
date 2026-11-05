// End-to-end tests for joining a meetup as a guest with its code.

import { test, expect } from '@playwright/test'
import { hostMeetup, joinAsGuest } from './helpers.js'

test.describe('Join a meetup', () => {
  test('should show an error for a code that does not exist', async ({ page }) => {
    await page.goto('/join')

    await page.getByTestId('join-code').fill('IOIOIO')
    await page.getByTestId('join-name').fill('Casey')
    await page.getByTestId('join-submit').click()

    await expect(page.getByTestId('join-error')).toHaveText('No meetup with that code was found.')
    await expect(page).toHaveURL(/\/join$/)
  })

  test('should show a guest who joins in the host member list', async ({ page, browser }) => {
    const { code } = await hostMeetup(page)
    await expect(page.getByTestId('member-item')).toHaveCount(1)

    const guestPage = await joinAsGuest(browser, code, 'Devi')

    await expect(guestPage.getByTestId('member-item').filter({ hasText: 'Devi' })).toContainText(
      '(you)',
    )
    await expect(page.getByTestId('member-item')).toHaveCount(2, { timeout: 10000 })
    await expect(page.getByTestId('member-item').filter({ hasText: 'Devi' })).toBeVisible()

    await guestPage.context().close()
  })
})
