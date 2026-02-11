#!/usr/bin/env tsx
/**
 * One-time script to obtain a Gmail OAuth2 refresh token.
 *
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (or env).
 * 2. In Google Cloud Console, add redirect URI: http://localhost:3000/oauth2callback
 * 3. Run: pnpm tsx apps/api/scripts/get-gmail-refresh-token.ts  (or from apps/api: pnpm tsx scripts/get-gmail-refresh-token.ts)
 * 4. Open http://localhost:3000 in your browser, sign in as the Gmail account that will send mail.
 * 5. Copy the refresh token from the terminal into GMAIL_REFRESH_TOKEN (e.g. in Render env vars).
 */

import dotenv from 'dotenv';
import { createServer } from 'node:http';
import { google } from 'googleapis';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../../.env') });
dotenv.config({ path: join(__dirname, '../.env') });

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';
const PORT = 3000;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (repo root or apps/api).');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/') {
    const authUrl = oauth2Client.generateAuthUrl({
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      access_type: 'offline',
      prompt: 'consent',
    });
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  if (url.pathname === '/oauth2callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<p>Missing code. Try again from <a href="/">start</a>.</p>');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<p>Success. Check your terminal for the refresh token.</p><p>You can close this tab.</p>'
      );

      console.log('\n--- GMAIL_REFRESH_TOKEN (copy this into your .env or Render env) ---\n');
      console.log(refreshToken ?? '(no refresh_token in response; try again with prompt=consent)');
      console.log('\n--- end ---\n');

      setTimeout(() => process.exit(0), 500);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<p>Token exchange failed. Check terminal.</p>');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
  console.log('Open that URL in your browser and sign in with the Gmail account that will send reminders.');
  console.log('After authorizing, the refresh token will be printed here.\n');
});
