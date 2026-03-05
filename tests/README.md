# Testing Guide

## Quick Start

Run all tests:
```bash
pnpm test:e2e
```

Run only Chromium (faster for local development):
```bash
PLAYWRIGHT_BROWSERS=chromium pnpm test:e2e
```

Run with UI (recommended for debugging):
```bash
pnpm test:e2e:ui
```

## Test Results Summary

From the latest test run:
- **63 tests passed** ✅
- **94 tests failed** (mostly configuration issues)
- **19 tests skipped** (expected when auth not configured)

## Common Issues

### 1. Browser Installation
If you see "Executable doesn't exist" errors:
```bash
pnpm exec playwright install
```

### 2. Authentication Failures (403)
Some tests require company admin credentials. If not configured:
- Tests will skip gracefully
- Or accept 403 as valid response
- To fix: Ensure company admin account exists with username 'admin' and password 'admin123'

### 3. API Server Connection
If tests can't reach the API server:
- Ensure dev server is running: `pnpm dev`
- Check that API is accessible at `http://localhost:4041`
- Playwright should start servers automatically, but verify they're working

### 4. Test Timeouts
Some tests may timeout due to:
- Large file uploads (51MB) - acceptable
- Slow network conditions
- Dev server startup time

## Test Categories

### API Tests (`tests/api/`)
- Ad upload endpoints
- Ad management (CRUD)
- Ad manifest generation
- Authentication and authorization

### Kiosk Tests (`tests/kiosk/`)
- Ad display and rotation
- User interactions
- WebSocket live updates
- Full upload-to-display flow

## Running Specific Tests

Run a specific test file:
```bash
pnpm test:e2e tests/api/ads-upload.spec.ts
```

Run tests matching a pattern:
```bash
pnpm test:e2e --grep "should upload image"
```

## Test Configuration

See `playwright.config.ts` for:
- Browser configuration
- Timeout settings
- Dev server setup
- Screenshot/video on failure

## Skipped tests

Some tests are skipped conditionally and appear as "skipped" in reports:

| File / area | Reason |
|-------------|--------|
| `tests/api/ads-upload.spec.ts` | Most tests skip when company admin token is not available (see [helpers/auth](../tests/helpers/auth.js)). |
| `tests/api/ads-management.spec.ts` | Same: require company admin token. |
| `tests/api/ads-manifest.spec.ts` | Two tests skip when no company admin token (create/assert on ads). |
| `tests/api/ads-endpoints.spec.ts` | Same: require company admin token. |
| `tests/api/ads-upload-flow.spec.ts` | Same: require company admin token. |
| `tests/kiosk/ads-rotation.spec.ts` | Two tests run only on Chromium to save CI time (`test.skip(projectName !== 'chromium', ...)`). |
| `tests/kiosk/ads-interaction.spec.ts` | Two tests run only on Chromium for the same reason. |

To run ads API tests that require auth, ensure a company admin account exists and credentials are provided (see [helpers/auth](helpers/auth.js) and Playwright env / config).

## Known Limitations

1. **Multi-browser testing**: Firefox and WebKit may have different behaviors
2. **Authentication**: Some tests require specific user roles
3. **File uploads**: Large files may timeout on slow connections
4. **WebSocket**: Connection stability can affect live update tests

## Best Practices

1. **Local Development**: Use `PLAYWRIGHT_BROWSERS=chromium` for faster iteration
2. **CI/CD**: Run all browsers for comprehensive coverage
3. **Debugging**: Use `pnpm test:e2e:ui` to see what's happening
4. **Manual Testing**: Use `tests/MANUAL_TESTING_CHECKLIST.md` for UI validation

## Troubleshooting

See `tests/TEST_FAILURES_NOTES.md` for detailed information about:
- Common failure patterns
- Expected vs. unexpected failures
- How to fix specific issues
- Test reliability notes
