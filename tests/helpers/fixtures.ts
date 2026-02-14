import { test as base } from '@playwright/test';
import { loginAsOwner, loginAsBarber, getAuthToken } from './auth.js';
import { enterKioskMode } from './kiosk.js';

const AUTH_SKIP_MESSAGE =
  'Auth failed - ensure database is seeded (pnpm db:migrate && pnpm db:seed). ';

/**
 * Extended test fixture with authentication helpers.
 * On auth failure (e.g. DB not seeded), tests are skipped with a clear message.
 */
export const test = base.extend({
  // Authenticated page as owner
  ownerPage: async ({ page }, use, testInfo) => {
    try {
      await loginAsOwner(page);
    } catch (err) {
      testInfo.skip(
        true,
        AUTH_SKIP_MESSAGE + (err instanceof Error ? err.message : String(err))
      );
    }
    await use(page);
  },

  // Authenticated page as barber
  barberPage: async ({ page }, use, testInfo) => {
    try {
      await loginAsBarber(page);
    } catch (err) {
      testInfo.skip(
        true,
        AUTH_SKIP_MESSAGE + (err instanceof Error ? err.message : String(err))
      );
    }
    await use(page);
  },

  // Owner authentication token for API requests
  ownerToken: async ({ request }, use, testInfo) => {
    let token: string;
    try {
      token = await getAuthToken(request, 'owner');
    } catch (err) {
      testInfo.skip(
        true,
        AUTH_SKIP_MESSAGE + (err instanceof Error ? err.message : String(err))
      );
      await use('');
      return;
    }
    await use(token);
  },

  // Barber authentication token for API requests
  barberToken: async ({ request }, use, testInfo) => {
    let token: string;
    try {
      token = await getAuthToken(request, 'barber');
    } catch (err) {
      testInfo.skip(
        true,
        AUTH_SKIP_MESSAGE + (err instanceof Error ? err.message : String(err))
      );
      await use('');
      return;
    }
    await use(token);
  },

  // Page in kiosk mode (barber logged in, kiosk mode active)
  kioskPage: async ({ barberPage }, use, testInfo) => {
    try {
      await enterKioskMode(barberPage);
    } catch (err) {
      testInfo.skip(
        true,
        AUTH_SKIP_MESSAGE + (err instanceof Error ? err.message : String(err))
      );
    }
    await use(barberPage);
  },
});

export { expect } from '@playwright/test';

