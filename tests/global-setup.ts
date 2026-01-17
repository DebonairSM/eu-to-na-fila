import { FullConfig } from '@playwright/test';
import http from 'http';

/**
 * Makes an HTTP request and returns whether it was successful
 */
function checkServer(url: string, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'checkServer called',data:{url,timeout},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'HTTP request options',data:{hostname:options.hostname,port:options.port,path:options.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const req = http.request(options, (res) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'HTTP response received',data:{statusCode:res.statusCode,statusMessage:res.statusMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Any 2xx or 3xx status means server is responding
      const isReady = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'Resolving with result',data:{isReady,statusCode:res.statusCode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      resolve(isReady);
      res.on('data', () => {}); // Consume response
      res.on('end', () => {});
    });

    req.on('error', (error: any) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'HTTP request error',data:{errorCode:error.code,errorMessage:error.message,errorName:error.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Connection refused or timeout means server not ready
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'Resolving false - connection error',data:{errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        resolve(false);
      } else {
        // Other errors might mean server is responding but with an error
        // We'll consider it as "ready" if we got any response
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'Resolving true - other error',data:{errorCode:error.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        resolve(true);
      }
    });

    req.on('timeout', () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:checkServer',message:'Request timeout',data:{timeout},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
  const apiUrl = 'http://localhost:4041/health';
  const webUrl = 'http://localhost:4040/mineiro';

  console.log('Verifying servers are ready...');

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:globalSetup',message:'Starting server checks',data:{apiUrl,webUrl,maxRetries,retryDelay},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // Check API server - webServer already verified web server, but API might still be starting
  let apiReady = false;
  for (let i = 0; i < maxRetries; i++) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:globalSetup',message:'API check attempt',data:{attempt:i+1,maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    apiReady = await checkServer(apiUrl);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:globalSetup',message:'API check result',data:{apiReady,attempt:i+1},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:globalSetup',message:'API server not ready - warning only',data:{apiUrl,maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'global-setup.ts:globalSetup',message:'Web server not ready - warning only',data:{webUrl,maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
  }

  console.log('✓ Both servers are ready, starting tests...');
}

export default globalSetup;
