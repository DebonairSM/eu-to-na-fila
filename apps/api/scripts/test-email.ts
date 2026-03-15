#!/usr/bin/env tsx
/**
 * Isolate email failures: try to send one test email and print the result.
 * Run with env loaded (e.g. from .env or Render env):
 *   TEST_EMAIL_TO=your@email.com pnpm exec tsx apps/api/scripts/test-email.ts
 * Or from apps/api:
 *   TEST_EMAIL_TO=your@email.com pnpm exec tsx scripts/test-email.ts
 *
 * If TEST_EMAIL_TO is not set, only checks whether a transport is configured
 * and prints that (no email sent).
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getEmailTransportKind, isEmailConfigured, sendTestEmail } from '../src/services/EmailService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(process.cwd(), '.env') });

const to = process.env.TEST_EMAIL_TO;

function main() {
  const transport = getEmailTransportKind();
  const configured = isEmailConfigured();

  console.log('Email transport (from env):', transport ?? 'none');
  console.log('isEmailConfigured():', configured);

  if (!configured) {
    console.log('\nNo transport configured. Set either:');
    console.log('  - GMAIL_USER + GMAIL_APP_PASSWORD');
    console.log('  - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN');
    console.log('Then run: pnpm exec tsx apps/api/scripts/get-gmail-refresh-token.ts to get GMAIL_REFRESH_TOKEN.');
    process.exit(1);
  }

  if (!to) {
    console.log('\nTo test sending, set TEST_EMAIL_TO and run again:');
    console.log('  TEST_EMAIL_TO=your@email.com pnpm exec tsx apps/api/scripts/test-email.ts');
    process.exit(0);
  }

  console.log('\nSending test email to:', to);
  sendTestEmail(to).then((result) => {
    if (result.ok) {
      console.log('OK – test email sent. Check inbox (and spam).');
      process.exit(0);
    } else {
      console.error('FAIL –', result.error);
      process.exit(1);
    }
  });
}

main();
