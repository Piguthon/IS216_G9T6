// End-to-end test for the home page's travel mode cards.

import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('should show MRT, Bus and Car as live travel modes', async ({ page }) => {
    await page.goto('/')

    const cards = page.getByTestId('home-mode-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.getByRole('heading', { level: 3 })).toHaveText(['MRT', 'Bus', 'Car'])
    await expect(page.getByTestId('home-mode-badge')).toHaveText(['Live', 'Live', 'Live'])
    await expect(cards.filter({ hasText: 'Car' }).getByTestId('home-mode-badge')).toHaveText('Live')
    await expect(page.getByText('Coming soon')).toHaveCount(0)
  })
})
