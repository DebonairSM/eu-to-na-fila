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
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  
  // The login page has responsive design - wait for form container to be present
  await page.waitForSelector('form, input#username, input[type="text"]', { state: 'attached', timeout: 10000 });
  
  // Use evaluate to make sure the form is visible (in case it's hidden by CSS)
  await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const style = (form as HTMLElement).style;
      style.display = 'block';
      style.visibility = 'visible';
      style.opacity = '1';
    });
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      const style = (input as HTMLElement).style;
      style.display = 'block';
      style.visibility = 'visible';
      style.opacity = '1';
    });
  });
  
  // Fill inputs directly using evaluate to bypass visibility issues
  await page.evaluate(({ username, password }) => {
    const usernameInput = document.querySelector('#username') as HTMLInputElement;
    const passwordInput = document.querySelector('#password') as HTMLInputElement;
    if (usernameInput) {
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { username: TEST_CREDENTIALS.owner.username, password: TEST_CREDENTIALS.owner.password });
  
  // Wait a moment for React to process the input changes
  await page.waitForTimeout(500);
  
  // Wait for navigation and submit form
  const navigationPromise = page.waitForURL(/\/owner/, { timeout: 20000 });
  
  // Submit form by clicking the submit button via evaluate
  await page.evaluate(() => {
    const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (button && !button.disabled) {
      button.click();
    } else {
      // Fallback: submit form directly
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  });
  
  // Wait for navigation
  await navigationPromise;
}

/**
 * Logs in as a barber/staff user
 */
export async function loginAsBarber(page: Page) {
  await page.goto('/mineiro/login');
  
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  
  // The login page has responsive design - wait for form container to be present
  // Look for the form or any visible input
  await page.waitForSelector('form, input#username, input[type="text"]', { state: 'attached', timeout: 10000 });
  
  // Use evaluate to make sure the form is visible (in case it's hidden by CSS)
  await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const style = (form as HTMLElement).style;
      style.display = 'block';
      style.visibility = 'visible';
      style.opacity = '1';
    });
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      const style = (input as HTMLElement).style;
      style.display = 'block';
      style.visibility = 'visible';
      style.opacity = '1';
    });
  });
  
  // Fill inputs directly using evaluate to bypass visibility issues
  await page.evaluate(({ username, password }) => {
    const usernameInput = document.querySelector('#username') as HTMLInputElement;
    const passwordInput = document.querySelector('#password') as HTMLInputElement;
    if (usernameInput) {
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { username: TEST_CREDENTIALS.barber.username, password: TEST_CREDENTIALS.barber.password });
  
  // Wait a moment for React to process the input changes
  await page.waitForTimeout(500);
  
  // Wait for navigation and submit form
  const navigationPromise = page.waitForURL(/\/manage/, { timeout: 20000 });
  
  // Submit form by clicking the submit button via evaluate
  await page.evaluate(() => {
    const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (button && !button.disabled) {
      button.click();
    } else {
      // Fallback: submit form directly
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }
  });
  
  // Wait for navigation
  await navigationPromise;
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

