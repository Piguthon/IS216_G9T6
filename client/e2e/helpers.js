// Shared steps for the end-to-end tests. Every helper creates fresh data.

import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'

export const PASSWORD = 'E2e-pass1!'

// A new email for every account, e.g. e2e+1762231234567-k3j9q2@fairspot.test
export function uniqueEmail() {
  const random = Math.random().toString(36).slice(2, 8)
  return `e2e+${Date.now()}-${random}@fairspot.test`
}

// A meetup date a week from today in Singapore (YYYY-MM-DD), so it is never in the past
export function futureDate(days = 7) {
  const singaporeNow = Date.now() + 8 * 60 * 60 * 1000
  return new Date(singaporeNow + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const searchSamples = JSON.parse(
  readFileSync(new URL('../../server/sample-data/onemap-search.json', import.meta.url), 'utf8'),
)

// Answers the browser's OneMap search with saved sample data, e.g. '178902' (SMU) or 'Tampines MRT'
export async function stubAddressSearch(page) {
  await page.route('**/api/common/elastic/search**', async (route) => {
    const searchVal = new URL(route.request().url()).searchParams.get('searchVal')
    const sample = searchSamples[searchVal] || {
      found: 0,
      totalNumPages: 0,
      pageNum: 1,
      results: [],
    }
    await route.fulfill({
      json: sample,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
}

// Sign up a new account. Signing up opens the profile page with the new name.
export async function signUp(page, name = 'E2E Host') {
  const email = uniqueEmail()
  await page.goto('/signup')
  await page.getByTestId('signup-name').fill(name)
  await page.getByTestId('signup-email').fill(email)
  await page.getByTestId('signup-password').fill(PASSWORD)
  await page.getByTestId('signup-confirm').fill(PASSWORD)
  await page.getByTestId('signup-submit').click()
  await expect(page.getByTestId('profile-name')).toHaveText(name)
  return { name, email, password: PASSWORD }
}

// Log in from the login page. Logging in opens the home page.
export async function logIn(page, email, password) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(email)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
}

// Create a meetup as the logged-in host and return its 6-character code
export async function createMeetup(page, occasion = 'E2E dinner') {
  await page.goto('/create')
  await page.getByTestId('create-occasion').fill(occasion)
  await page.getByTestId('create-date').fill(futureDate())
  await page.getByTestId('create-time').fill('19:00')
  await page.getByTestId('create-submit').click()
  await expect(page.getByTestId('create-code')).toHaveText(/^[A-Z0-9]{6}$/)
  return (await page.getByTestId('create-code').textContent()).trim()
}

// Sign up, create a meetup and open its lobby as the host
export async function hostMeetup(page, occasion = 'E2E dinner') {
  const host = await signUp(page, 'E2E Host')
  const code = await createMeetup(page, occasion)
  await page.getByTestId('create-go-to-meetup').click()
  await expect(page.getByTestId('lobby-code')).toHaveText(code)
  return { host, code }
}

// Joins a meetup as a guest in a second browser context and returns the guest's page
export async function joinAsGuest(browser, code, name = 'E2E Guest') {
  const context = await browser.newContext()
  const page = await context.newPage()
  await stubAddressSearch(page)
  await page.goto('/join')
  await page.getByTestId('join-code').fill(code)
  await page.getByTestId('join-name').fill(name)
  await page.getByTestId('join-submit').click()
  await expect(page.getByTestId('lobby-code')).toHaveText(code)
  return page
}

// Choose a start point in the lobby with the (stubbed) address search
export async function setStartPoint(page, searchText) {
  await page.getByTestId('address-input').fill(searchText)
  await page.getByTestId('address-suggestion').first().click()
  await expect(page.getByTestId('lobby-confirm-location')).toBeEnabled()
}

// Press Confirm location in the lobby
export async function confirmLocation(page) {
  await page.getByTestId('lobby-confirm-location').click()
  await expect(page.getByTestId('lobby-confirmed')).toContainText('Location confirmed.')
}
