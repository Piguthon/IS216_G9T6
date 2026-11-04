// e2e/join-meetup.spec.js
// Journey: a friend joins a meetup with its code and their name (no account needed).
// The guest uses a second browser context, like a friend on another phone.

import { test, expect } from '@playwright/test'
import { hostMeetup, joinAsGuest } from './helpers.js'

test.describe('Join a meetup', () => {
  test('should show an error for a code that does not exist', async ({ page }) => {
    // Setup: a guest on the join page
    await page.goto('/join')

    // Action: join with a code no meetup can have (codes never use the letters I or O)
    await page.getByTestId('join-code').fill('IOIOIO')
    await page.getByTestId('join-name').fill('Casey')
    await page.getByTestId('join-submit').click()

    // Assert: an error, and the guest stays on the join page
    await expect(page.getByTestId('join-error')).toHaveText('No meetup with that code was found.')
    await expect(page).toHaveURL(/\/join$/)
  })

  test('should show a guest who joins in the host member list', async ({ page, browser }) => {
    // Setup: a host with a new meetup, waiting in the lobby
    const { code } = await hostMeetup(page)
    await expect(page.getByTestId('member-item')).toHaveCount(1)

    // Action: a guest joins from another browser
    const guestPage = await joinAsGuest(browser, code, 'Devi')

    // Assert: the guest sees themselves as "you"...
    await expect(guestPage.getByTestId('member-item').filter({ hasText: 'Devi' })).toContainText(
      '(you)',
    )
    // ...and the host's lobby picks them up on its next refresh (it polls every 5 seconds)
    await expect(page.getByTestId('member-item')).toHaveCount(2, { timeout: 10000 })
    await expect(page.getByTestId('member-item').filter({ hasText: 'Devi' })).toBeVisible()

    await guestPage.context().close()
  })
})
