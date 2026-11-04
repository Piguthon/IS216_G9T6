// e2e/member-security.spec.js
// Journey: someone who only knows a meetup's code tries to act as one of its members.
// Member ids are public, so the server works out who is calling from their login or their
// guest secret (X-Member-Token), never from the page. A stranger with neither is refused.

import { test, expect } from '@playwright/test'
import { hostMeetup, joinAsGuest, setStartPoint } from './helpers.js'

const API_URL = 'http://localhost:8000/api'

test.describe('Member security', () => {
  test('should refuse a stranger who confirms a location with no credentials', async ({
    page,
    browser,
  }) => {
    // Setup: a host and a guest; the guest has a start point but hasn't confirmed it
    const { code } = await hostMeetup(page)
    const guestPage = await joinAsGuest(browser, code, 'Farah')
    await setStartPoint(guestPage, 'Tampines MRT')
    const farah = guestPage.getByTestId('member-item').filter({ hasText: 'Farah' })
    await expect(farah.getByTestId('member-waiting')).toBeVisible()

    // Action: a stranger in a fresh browser, who only knows the code, calls the API directly
    const strangerContext = await browser.newContext()
    const strangerPage = await strangerContext.newPage()
    const response = await strangerPage.request.put(`${API_URL}/meetups/${code}/me/ready`, {
      data: { ready: true },
    })

    // Assert: refused as not a member...
    expect(response.status()).toBe(403)
    expect(await response.json()).toEqual({ error: 'You are not a member of this meetup.' })

    // ...and the guest's lobby is unchanged after its next refresh (it polls every 5 seconds)
    await guestPage.reload()
    await expect(farah.getByTestId('member-waiting')).toBeVisible()
    await expect(guestPage.getByTestId('lobby-confirmed')).toBeHidden()

    await strangerContext.close()
    await guestPage.context().close()
  })
})
