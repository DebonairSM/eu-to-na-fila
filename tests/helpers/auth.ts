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
 * Logs in as an owner user by directly authenticating via API and setting session
 * This bypasses the login form which has visibility issues in tests
 */
export async function loginAsOwner(page: Page) {
  // Get authentication token via API
  const token = await getAuthToken(page.request, 'owner');
  
  // Set authentication state in sessionStorage BEFORE navigating
  await page.goto('/mineiro');
  await page.evaluate(({ token, username }) => {
    // Set token in sessionStorage (matches API client storage key)
    sessionStorage.setItem('eutonafila_auth_token', token);
    // Set auth state (matches useAuth hook)
    sessionStorage.setItem('staffAuth', 'true');
    sessionStorage.setItem('staffUser', JSON.stringify({
      id: 1,
      username: username,
      role: 'owner',
      name: username,
    }));
    sessionStorage.setItem('staffRole', 'owner');
  }, { token, username: TEST_CREDENTIALS.owner.username });
  
  // Now navigate to owner page
  await page.goto('/mineiro/owner', { waitUntil: 'networkidle' });
  
  // Wait for page to load and verify we're on owner dashboard
  await page.waitForURL(/\/owner/, { timeout: 15000 });
}

/**
 * Logs in as a barber/staff user by directly authenticating via API and setting session
 * This bypasses the login form which has visibility issues in tests
 */
export async function loginAsBarber(page: Page) {
  // Get authentication token via API
  const token = await getAuthToken(page.request, 'barber');
  
  // Set authentication state in sessionStorage BEFORE navigating
  await page.goto('/mineiro');
  await page.evaluate(({ token, username }) => {
    // Set token in sessionStorage (matches API client storage key)
    sessionStorage.setItem('eutonafila_auth_token', token);
    // Set auth state (matches useAuth hook)
    sessionStorage.setItem('staffAuth', 'true');
    sessionStorage.setItem('staffUser', JSON.stringify({
      id: 1,
      username: username,
      role: 'barber',
      name: username,
    }));
    sessionStorage.setItem('staffRole', 'barber');
  }, { token, username: TEST_CREDENTIALS.barber.username });
  
  // Now navigate to manage page
  await page.goto('/mineiro/manage', { waitUntil: 'networkidle' });
  
  // Wait for page to load and verify we're on queue manager
  await page.waitForURL(/\/manage/, { timeout: 15000 });
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
  
  // Handle rate limiting (429) - response may still contain valid token
  const data = await response.json();
  
  // If we got a valid token, use it even if status is 429 (rate limited)
  if (data.valid && data.token) {
    return data.token;
  }
  
  // Otherwise check if response was successful
  if (!response.ok()) {
    const errorText = JSON.stringify(data);
    throw new Error(`Authentication failed: ${response.status()} ${errorText}`);
  }
  
  if (!data.valid || !data.token) {
    throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
  }
  
  return data.token;
}
