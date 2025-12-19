import { test as base } from '@playwright/test';
import { loginAsOwner, loginAsBarber, getAuthToken } from './auth.js';
import { enterKioskMode, exitKioskMode } from './kiosk.js';

/**
 * Extended test fixture with authentication helpers
 */
export const test = base.extend({
  // Authenticated page as owner
  ownerPage: async ({ page }, use) => {
    await loginAsOwner(page);
    await use(page);
  },
  
  // Authenticated page as barber
  barberPage: async ({ page }, use) => {
    await loginAsBarber(page);
    await use(page);
  },
  
  // Owner authentication token for API requests
  ownerToken: async ({ request }, use) => {
    const token = await getAuthToken(request, 'owner');
    await use(token);
  },
  
  // Barber authentication token for API requests
  barberToken: async ({ request }, use) => {
    const token = await getAuthToken(request, 'barber');
    await use(token);
  },
  
  // Page in kiosk mode (barber logged in, kiosk mode active)
  kioskPage: async ({ barberPage }, use) => {
    await enterKioskMode(barberPage);
    await use(barberPage);
  },
});

export { expect } from '@playwright/test';

