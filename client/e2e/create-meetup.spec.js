// End-to-end tests for creating a meetup and opening its lobby.

import { test, expect } from '@playwright/test'
import { signUp, futureDate } from './helpers.js'

test.describe('Create a meetup', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page)
    await page.goto('/create')
  })

  test('should show a validation error when the form is empty', async ({ page }) => {
    await page.getByTestId('create-submit').click()

    await expect(page.getByTestId('create-error')).toHaveText(
      'Please fill out all fields to create your meetup.',
    )
    await expect(page.getByTestId('create-code')).toBeHidden()
  })

  test('should show a 6-character code for a valid meetup', async ({ page }) => {
    await page.getByTestId('create-occasion').fill('Project dinner')
    await page.getByTestId('create-date').fill(futureDate())
    await page.getByTestId('create-time').fill('19:00')
    await page.getByTestId('create-submit').click()

    await expect(page.getByTestId('create-code')).toHaveText(/^[A-Z0-9]{6}$/)
    await expect(page.getByTestId('create-result')).toContainText('Project dinner')
  })

  test('should open the lobby with the same code and occasion from Go to meetup', async ({
    page,
  }) => {
    await page.getByTestId('create-occasion').fill('Study session')
    await page.getByTestId('create-date').fill(futureDate())
    await page.getByTestId('create-time').fill('14:30')
    await page.getByTestId('create-submit').click()
    await expect(page.getByTestId('create-code')).toHaveText(/^[A-Z0-9]{6}$/)
    const code = (await page.getByTestId('create-code').textContent()).trim()

    await page.getByTestId('create-go-to-meetup').click()

    await expect(page).toHaveURL(`/meetup/${code}`)
    await expect(page.getByTestId('lobby-code')).toHaveText(code)
    await expect(page.getByTestId('lobby-occasion')).toHaveText('Study session')
    await expect(page.getByTestId('member-item')).toHaveCount(1)
    await expect(page.getByTestId('member-item')).toContainText('(you)')
  })
})
