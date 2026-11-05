// End-to-end tests for accounts: sign up, log out, log in, a wrong password and the login guard.

import { test, expect } from '@playwright/test'
import { signUp, logIn } from './helpers.js'

test.describe('Accounts', () => {
  test('should land on the profile with the new name after signing up', async ({ page }) => {
    const user = await signUp(page, 'Avery Tan')

    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByTestId('profile-name')).toHaveText('Avery Tan')
    await expect(page.getByTestId('profile-email')).toHaveText(user.email)
    await expect(page.getByTestId('nav-logout')).toBeVisible()
  })

  test('should log out and show the logged-out page', async ({ page }) => {
    await signUp(page)

    await page.getByTestId('nav-logout').click()

    await expect(page.getByTestId('logout-heading')).toHaveText('Logged out')
    await expect(page.getByTestId('nav-login')).toBeVisible()
    await expect(page.getByTestId('nav-logout')).toBeHidden()
  })

  test('should log back in with the same email and password', async ({ page }) => {
    const user = await signUp(page, 'Blake Lim')
    await page.getByTestId('nav-logout').click()
    await expect(page.getByTestId('logout-heading')).toBeVisible()

    await logIn(page, user.email, user.password)

    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('nav-profile')).toBeVisible()
    await page.getByTestId('nav-profile').click()
    await expect(page.getByTestId('profile-name')).toHaveText('Blake Lim')
  })

  test('should show an error for a wrong password', async ({ page }) => {
    const user = await signUp(page)
    await page.getByTestId('nav-logout').click()
    await expect(page.getByTestId('logout-heading')).toBeVisible()

    await logIn(page, user.email, 'Wrong-pass9!')

    await expect(page.getByTestId('login-error')).toHaveText('Invalid email or password.')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('nav-login')).toBeVisible()
  })

  test('should redirect /create to /login when logged out', async ({ page }) => {
    await page.goto('/create')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('login-page')).toBeVisible()
    await expect(page.getByTestId('create-meetup-page')).toBeHidden()
  })
})
