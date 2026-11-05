// End-to-end test of the full flow: ranking, voting, confirming and the summary.

import { test, expect } from '@playwright/test'
import {
  hostMeetup,
  joinAsGuest,
  stubAddressSearch,
  setStartPoint,
  confirmLocation,
} from './helpers.js'

const RANKING_TIMEOUT = 90 * 1000

test.describe('Results and voting', () => {
  test('should rank meeting points, take a vote and let the host confirm one', async ({
    page,
    browser,
  }) => {
    test.slow()

    await stubAddressSearch(page)
    const { code } = await hostMeetup(page, 'E2E results')
    await setStartPoint(page, '178902')
    await confirmLocation(page)
    const guestPage = await joinAsGuest(browser, code, 'Farah')
    await setStartPoint(guestPage, 'Tampines MRT')
    await confirmLocation(guestPage)

    await page.getByTestId('lobby-results-link').click({ timeout: 10000 })

    await expect(page).toHaveURL(`/meetup/${code}/results`)
    const cards = page.getByTestId('meeting-point-card')
    await expect(cards.first()).toBeVisible({ timeout: RANKING_TIMEOUT })
    await expect(cards.first()).toContainText('min longest')

    const hostOptions = page.getByTestId('vote-option')
    await expect(hostOptions.first()).toBeVisible()
    const firstChoice = (
      await hostOptions.first().getByTestId('vote-option-name').textContent()
    ).trim()

    await guestPage.getByTestId('lobby-vote-link').click({ timeout: 10000 })
    await expect(guestPage.getByTestId('vote-option').first()).toBeVisible()
    await guestPage.getByTestId('vote-button').first().click()

    await expect(guestPage.getByTestId('vote-button').first()).toHaveText('Your vote')
    await expect(hostOptions.first().getByTestId('vote-count')).toHaveText('1 vote', {
      timeout: 10000,
    })

    await page.getByTestId('vote-confirm').first().click()

    await expect(page.getByTestId('vote-title').first()).toHaveText(
      'Meeting point confirmed by the host',
    )
    await expect(page.getByTestId('vote-final')).toContainText(firstChoice)

    await page.getByTestId('results-summary-link').click()

    await expect(page).toHaveURL(`/meetup/${code}/summary`)
    await expect(page.getByTestId('summary-occasion')).toHaveText('E2E results')
    await expect(page.getByTestId('summary-point')).toContainText(firstChoice)

    await guestPage.context().close()
  })
})
