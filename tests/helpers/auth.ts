import { Page, expect, APIRequestContext } from '@playwright/test';

/**
 * Authentication credentials for testing
 */
export const TEST_CREDENTIALS = {
  owner: {
    username: 'owner',
    password: 'owner123',
    pin: '1234',
  },
  barber: {
    username: 'barber',
    password: 'barber123',
    pin: '0000',
  },
  kiosk: {
    username: 'kiosk',
    password: 'kiosk123',
    pin: '0000',
  },
} as const;

/**
 * Logs in as an owner user
 * Navigates to login page, fills in credentials, and authenticates
 */
export async function loginAsOwner(page: Page) {
  await page.goto('/mineiro/login');
  
  // Wait for login form to be visible
  await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
  
  // Fill in credentials
  const usernameInput = page.locator('input[type="text"], input[name="username"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  
  await usernameInput.fill(TEST_CREDENTIALS.owner.username);
  await passwordInput.fill(TEST_CREDENTIALS.owner.password);
  
  // Submit form
  await page.locator('button[type="submit"]').click();
  
  // Wait for navigation to owner dashboard
  await page.waitForURL(/\/owner/, { timeout: 10000 });
}

/**
 * Logs in as a barber/staff user
 */
export async function loginAsBarber(page: Page) {
  await page.goto('/mineiro/login');
  
  await expect(page.locator('input[type="text"], input[name="username"]').first()).toBeVisible();
  
  const usernameInput = page.locator('input[type="text"], input[name="username"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  
  await usernameInput.fill(TEST_CREDENTIALS.barber.username);
  await passwordInput.fill(TEST_CREDENTIALS.barber.password);
  
  await page.locator('button[type="submit"]').click();
  
  // Wait for navigation to queue manager
  await page.waitForURL(/\/manage/, { timeout: 10000 });
}

/**
 * Gets an authentication token for API requests
 * Uses the authenticate endpoint directly
 * Can use either a Page (via page.request) or APIRequestContext
 */
export async function getAuthToken(
  pageOrRequest: Page | APIRequestContext,
  role: 'owner' | 'barber' = 'owner'
): Promise<string> {
  const credentials = role === 'owner' ? TEST_CREDENTIALS.owner : TEST_CREDENTIALS.barber;
  
  // Use page.request if it's a Page, otherwise use the request context directly
  const requestContext = 'request' in pageOrRequest ? pageOrRequest.request : pageOrRequest;
  
  const response = await requestContext.post('http://localhost:4041/api/shops/mineiro/auth', {
    data: {
      pin: credentials.pin,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.valid).toBeTruthy();
  expect(data.token).toBeDefined();
  
  return data.token;
}

