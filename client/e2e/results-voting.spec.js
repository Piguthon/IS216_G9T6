// e2e/results-voting.spec.js
// Journey: the full core flow. Two members confirm their start points, the host works out the
// fair meeting points, the guest votes, the host confirms a meeting point and the summary opens.
// The ranking calls OneMap's routing API for real (from our server), so this test is slow.

import { test, expect } from '@playwright/test'
import {
  hostMeetup,
  joinAsGuest,
  stubAddressSearch,
  setStartPoint,
  confirmLocation,
} from './helpers.js'

// Working out the ranking asks OneMap for every member's trip to about 30 stations
const RANKING_TIMEOUT = 90 * 1000

test.describe('Results and voting', () => {
  test('should rank meeting points, take a vote and let the host confirm one', async ({
    page,
    browser,
  }) => {
    test.slow()

    // Setup: a host and a guest who have both confirmed their start points
    await stubAddressSearch(page)
    const { code } = await hostMeetup(page, 'E2E results')
    await setStartPoint(page, '178902')
    await confirmLocation(page)
    const guestPage = await joinAsGuest(browser, code, 'Farah')
    await setStartPoint(guestPage, 'Tampines MRT')
    await confirmLocation(guestPage)

    // Action: the host opens the fair meeting points
    await page.getByTestId('lobby-results-link').click({ timeout: 10000 })

    // Assert: at least one ranked meeting point, with the best one first
    await expect(page).toHaveURL(`/meetup/${code}/results`)
    const cards = page.getByTestId('meeting-point-card')
    await expect(cards.first()).toBeVisible({ timeout: RANKING_TIMEOUT })
    await expect(cards.first()).toContainText('min longest')

    // The host's vote panel lists the same meeting points
    const hostOptions = page.getByTestId('vote-option')
    await expect(hostOptions.first()).toBeVisible()
    // (no votes yet, so the name has no "Leading" badge beside it)
    const firstChoice = (
      await hostOptions.first().getByTestId('vote-option-name').textContent()
    ).trim()

    // Action: the guest's lobby now offers the vote; the guest votes for the first point
    await guestPage.getByTestId('lobby-vote-link').click({ timeout: 10000 })
    await expect(guestPage.getByTestId('vote-option').first()).toBeVisible()
    await guestPage.getByTestId('vote-button').first().click()

    // Assert: the guest's vote is marked, and the host sees it on their next refresh
    await expect(guestPage.getByTestId('vote-button').first()).toHaveText('Your vote')
    await expect(hostOptions.first().getByTestId('vote-count')).toHaveText('1 vote', {
      timeout: 10000,
    })

    // Action: the host confirms the first meeting point
    await page.getByTestId('vote-confirm').first().click()

    // Assert: the ballot is replaced by the confirmed choice
    await expect(page.getByTestId('vote-title').first()).toHaveText(
      'Meeting point confirmed by the host',
    )
    await expect(page.getByTestId('vote-final')).toContainText(firstChoice)

    // Action: open the summary
    await page.getByTestId('results-summary-link').click()

    // Assert: the summary shows the meetup and the confirmed meeting point
    await expect(page).toHaveURL(`/meetup/${code}/summary`)
    await expect(page.getByTestId('summary-occasion')).toHaveText('E2E results')
    await expect(page.getByTestId('summary-point')).toContainText(firstChoice)

    await guestPage.context().close()
  })
})
