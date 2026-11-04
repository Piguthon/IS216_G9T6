// e2e/profile.spec.js
// Journey: saved locations on the profile page. A user adds a location, renames it, sets one
// as their default and deletes one. Every test signs up its own account.

import { test, expect } from '@playwright/test'
import { signUp, stubAddressSearch } from './helpers.js'

// Add a saved location with the (stubbed) address search
async function addLocation(page, nickname, searchText) {
  await page.getByTestId('location-add').click()
  await page.getByTestId('location-nickname').fill(nickname)
  await page.getByTestId('address-input').fill(searchText)
  await page.getByTestId('address-suggestion').first().click()
  await page.getByTestId('location-save').click()
  await expect(page.getByTestId('location-message')).toHaveText('Location saved.')
}

test.describe('Saved locations', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: a new account on its profile page, with no saved locations
    await stubAddressSearch(page)
    await signUp(page)
    await expect(page.getByTestId('saved-location')).toHaveCount(0)
  })

  test('should add a saved location', async ({ page }) => {
    // Action: add Home
    await addLocation(page, 'Home', 'Bishan MRT')

    // Assert: Home is listed with its address, and the tab counts it
    const home = page.getByTestId('saved-location').filter({ hasText: 'Home' })
    await expect(page.getByTestId('saved-location')).toHaveCount(1)
    await expect(home).toContainText('BISHAN MRT')
    await expect(page.getByTestId('profile-tab-locations')).toHaveText('Locations (1)')
  })

  test('should rename a saved location', async ({ page }) => {
    // Setup: one saved location
    await addLocation(page, 'School', '178902')

    // Action: rename it
    await page.getByTestId('location-edit').click()
    await page.getByTestId('location-rename-input').fill('Campus')
    await page.getByTestId('location-rename-save').click()

    // Assert: the new name replaces the old one
    await expect(page.getByTestId('location-message')).toHaveText('Location updated.')
    await expect(page.getByTestId('saved-location')).toHaveCount(1)
    await expect(page.getByTestId('saved-location')).toContainText('Campus')
    await expect(page.getByTestId('saved-location')).not.toContainText('School')
  })

  test('should set a location as the default', async ({ page }) => {
    // Setup: two saved locations, neither the default yet
    await addLocation(page, 'Home', 'Bishan MRT')
    await addLocation(page, 'Work', 'Dhoby Ghaut MRT')
    const home = page.getByTestId('saved-location').filter({ hasText: 'Home' })
    const work = page.getByTestId('saved-location').filter({ hasText: 'Work' })
    await expect(page.getByTestId('location-default-badge')).toHaveCount(0)

    // Action: make Work the default
    await work.getByTestId('location-make-default').click()

    // Assert: only Work has the Default badge
    await expect(page.getByTestId('location-message')).toHaveText('Default location updated.')
    await expect(work.getByTestId('location-default-badge')).toBeVisible()
    await expect(home.getByTestId('location-default-badge')).toBeHidden()

    // Action and assert: making Home the default moves the badge
    await home.getByTestId('location-make-default').click()
    await expect(home.getByTestId('location-default-badge')).toBeVisible()
    await expect(work.getByTestId('location-default-badge')).toBeHidden()
  })

  test('should delete a saved location', async ({ page }) => {
    // Setup: two saved locations
    await addLocation(page, 'Home', 'Bishan MRT')
    await addLocation(page, 'Gym', 'Jurong East MRT')
    const home = page.getByTestId('saved-location').filter({ hasText: 'Home' })

    // Action: delete Home and confirm
    await home.getByTestId('location-delete').click()
    await home.getByTestId('location-delete-confirm').click()

    // Assert: only Gym is left
    await expect(page.getByTestId('location-message')).toHaveText('Location deleted.')
    await expect(page.getByTestId('saved-location')).toHaveCount(1)
    await expect(page.getByTestId('saved-location')).toContainText('Gym')
    await expect(page.getByTestId('profile-tab-locations')).toHaveText('Locations (1)')
  })
})
