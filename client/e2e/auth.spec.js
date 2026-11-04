// e2e/auth.spec.js
// Journey: accounts. Sign up, log out, log back in, a wrong password, and the router guard
// that sends logged-out visitors from /create to /login.
// Every test signs up its own new account, so no login details are needed.

import { test, expect } from '@playwright/test'
import { signUp, logIn } from './helpers.js'

test.describe('Accounts', () => {
  test('should land on the profile with the new name after signing up', async ({ page }) => {
    // Setup and actions: sign up a new account
    const user = await signUp(page, 'Avery Tan')

    // Assert: the profile shows the new account and the navbar shows the logged-in links
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByTestId('profile-name')).toHaveText('Avery Tan')
    await expect(page.getByTestId('profile-email')).toHaveText(user.email)
    await expect(page.getByTestId('nav-logout')).toBeVisible()
  })

  test('should log out and show the logged-out page', async ({ page }) => {
    // Setup: a logged-in user
    await signUp(page)

    // Action: press Log out in the navbar
    await page.getByTestId('nav-logout').click()

    // Assert: the logged-out page, and the navbar offers Log in again
    await expect(page.getByTestId('logout-heading')).toHaveText('Logged out')
    await expect(page.getByTestId('nav-login')).toBeVisible()
    await expect(page.getByTestId('nav-logout')).toBeHidden()
  })

  test('should log back in with the same email and password', async ({ page }) => {
    // Setup: an account that has logged out
    const user = await signUp(page, 'Blake Lim')
    await page.getByTestId('nav-logout').click()
    await expect(page.getByTestId('logout-heading')).toBeVisible()

    // Action: log in again
    await logIn(page, user.email, user.password)

    // Assert: home page, logged in, and the profile belongs to the same account
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('nav-profile')).toBeVisible()
    await page.getByTestId('nav-profile').click()
    await expect(page.getByTestId('profile-name')).toHaveText('Blake Lim')
  })

  test('should show an error for a wrong password', async ({ page }) => {
    // Setup: an account that has logged out
    const user = await signUp(page)
    await page.getByTestId('nav-logout').click()
    await expect(page.getByTestId('logout-heading')).toBeVisible()

    // Action: log in with the wrong password
    await logIn(page, user.email, 'Wrong-pass9!')

    // Assert: an error, and the user stays on the login page, logged out
    await expect(page.getByTestId('login-error')).toHaveText('Invalid email or password.')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('nav-login')).toBeVisible()
  })

  test('should redirect /create to /login when logged out', async ({ page }) => {
    // Setup: a fresh browser is logged out. Action: open the create page directly
    await page.goto('/create')

    // Assert: the router guard sends the visitor to the login page instead
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('login-page')).toBeVisible()
    await expect(page.getByTestId('create-meetup-page')).toBeHidden()
  })
})
