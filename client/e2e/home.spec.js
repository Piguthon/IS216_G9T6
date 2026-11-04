// e2e/home.spec.js
// Journey: a visitor opens the home page and sees every way the group can travel.

import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('should show MRT, Bus and Car as live travel modes', async ({ page }) => {
    // Action: open the home page
    await page.goto('/')

    // Assert: three travel mode cards, each marked Live, and nothing "coming soon"
    const cards = page.getByTestId('home-mode-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.getByRole('heading', { level: 3 })).toHaveText(['MRT', 'Bus', 'Car'])
    await expect(page.getByTestId('home-mode-badge')).toHaveText(['Live', 'Live', 'Live'])
    await expect(cards.filter({ hasText: 'Car' }).getByTestId('home-mode-badge')).toHaveText('Live')
    await expect(page.getByText('Coming soon')).toHaveCount(0)
  })
})
