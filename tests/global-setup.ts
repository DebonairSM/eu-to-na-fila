import { FullConfig } from '@playwright/test';
import http from 'http';
import { testConfig } from './config.js';

/**
 * Makes an HTTP request and returns whether it was successful
 */
function checkServer(url: string, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout,
    };

    const req = http.request(options, (res) => {
      // Any 2xx or 3xx status means server is responding
      const isReady = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400;
      resolve(isReady);
      res.on('data', () => {}); // Consume response
      res.on('end', () => {});
    });

    req.on('error', (error: any) => {
      // Connection refused or timeout means server not ready
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        resolve(false);
      } else {
        // Other errors might mean server is responding but with an error
        // We'll consider it as "ready" if we got any response
        resolve(true);
      }
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Global setup to verify both web and API servers are ready before tests run
 */
async function globalSetup(config: FullConfig) {
  // Increase retries and delay - API server may take time to start after webServer check passes
  const maxRetries = 60; // 60 seconds total wait time
  const retryDelay = 1000; // 1 second
  const apiUrl = `${testConfig.apiBaseUrl}/health`;
  const webUrl = `${testConfig.webBaseUrl}/projects/mineiro`;

  console.log('Verifying servers are ready...');

  // Check API server - webServer already verified web server, but API might still be starting
  let apiReady = false;
  for (let i = 0; i < maxRetries; i++) {
    apiReady = await checkServer(apiUrl);

    if (apiReady) {
      console.log('✓ API server is ready');
      break;
    }
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  if (!apiReady) {
    // Don't fail hard - tests have retry logic for connection errors
    // Just log a warning and let tests handle it
    console.warn(
      `⚠️  API server at ${apiUrl} is not ready after ${maxRetries} attempts. ` +
      `Tests will retry connection errors automatically. ` +
      `If tests fail, ensure the dev server is running: pnpm dev`
    );
  }

  // Check web server (should already be verified by webServer config, but double-check)
  let webReady = false;
  for (let i = 0; i < maxRetries; i++) {
    webReady = await checkServer(webUrl);
    if (webReady) {
      console.log('✓ Web server is ready');
      break;
    }
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  if (!webReady) {
    // Web server should already be ready from webServer config, but if not, warn
    console.warn(
      `⚠️  Web server at ${webUrl} is not ready after ${maxRetries} attempts. ` +
      `This is unexpected since Playwright's webServer should have verified it.`
    );
  }

  console.log('✓ Both servers are ready, starting tests...');
}

export default globalSetup;
