// End-to-end test that someone who only knows a meetup's code cannot act as a member.

import { test, expect } from '@playwright/test'
import { hostMeetup, joinAsGuest, setStartPoint } from './helpers.js'

const API_URL = 'http://localhost:8000/api'

test.describe('Member security', () => {
  test('should refuse a stranger who confirms a location with no credentials', async ({
    page,
    browser,
  }) => {
    const { code } = await hostMeetup(page)
    const guestPage = await joinAsGuest(browser, code, 'Farah')
    await setStartPoint(guestPage, 'Tampines MRT')
    const farah = guestPage.getByTestId('member-item').filter({ hasText: 'Farah' })
    await expect(farah.getByTestId('member-waiting')).toBeVisible()

    const strangerContext = await browser.newContext()
    const strangerPage = await strangerContext.newPage()
    const response = await strangerPage.request.put(`${API_URL}/meetups/${code}/me/ready`, {
      data: { ready: true },
    })

    expect(response.status()).toBe(403)
    expect(await response.json()).toEqual({ error: 'You are not a member of this meetup.' })

    await guestPage.reload()
    await expect(farah.getByTestId('member-waiting')).toBeVisible()
    await expect(guestPage.getByTestId('lobby-confirmed')).toBeHidden()

    await strangerContext.close()
    await guestPage.context().close()
  })
})
