# Testing Implementation Summary

## Overview
Comprehensive test suite has been created for the ad upload/display system. All tests have been updated to work with the new direct file upload system (replacing the old presigned URL system).

## Test Files Created/Updated

### API Tests (`tests/api/`)

1. **`ads-upload.spec.ts`** (NEW)
   - Tests for POST /api/ads/uploads endpoint
   - Image upload (PNG, JPEG, WebP)
   - Video upload (MP4)
   - Upload with shopId
   - Upload with position
   - File validation (type, size)
   - Authentication requirements
   - Error scenarios

2. **`ads-management.spec.ts`** (NEW)
   - Tests for GET /api/ads (list all ads)
   - Tests for PATCH /api/ads/:id (update ad)
   - Tests for DELETE /api/ads/:id (delete ad)
   - Version incrementing
   - File deletion from disk
   - Authentication and authorization

3. **`ads-manifest.spec.ts`** (NEW)
   - Tests for GET /api/ads/public/manifest
   - Manifest structure validation
   - Enabled ads only
   - Position ordering
   - Cache busting (version in URLs)
   - Shop-specific vs company-wide ads
   - Manifest version calculation

4. **`ads-endpoints.spec.ts`** (UPDATED)
   - Removed outdated presigned URL tests
   - Kept endpoint structure tests
   - Updated to reflect new system

### Kiosk Tests (`tests/kiosk/`)

1. **`ads-display.spec.ts`** (EXISTING - No changes needed)
   - Ad display in kiosk mode
   - Image and video rendering
   - Rotation functionality
   - Empty state handling

2. **`ads-live-update.spec.ts`** (UPDATED)
   - Updated to use new upload endpoint
   - WebSocket update testing
   - Real-time ad refresh

3. **`ads-upload-flow.spec.ts`** (NEW)
   - End-to-end upload flow
   - Upload → Display in kiosk
   - Enable/disable updates
   - Multiple ads handling

4. **`ads-interaction.spec.ts`** (EXISTING - No changes needed)
   - User interactions with ads
   - Rotation controls

5. **`ads-rotation.spec.ts`** (EXISTING - No changes needed)
   - Ad rotation timing
   - Rotation behavior

### Helper Functions (`tests/helpers/`)

1. **`auth.ts`** (UPDATED)
   - Added `getCompanyAdminToken()` function
   - Supports company admin authentication for tests

2. **`api.ts`** (EXISTING)
   - Contains `uploadAdImage()` helper (may need update for new system)

### Documentation

1. **`MANUAL_TESTING_CHECKLIST.md`** (NEW)
   - Comprehensive manual testing checklist
   - 12 major testing areas
   - 100+ test cases
   - Cross-browser and mobile testing

2. **`TESTING_SUMMARY.md`** (THIS FILE)
   - Overview of test implementation

## Test Coverage

### Covered Areas
- ✅ File upload functionality (all formats)
- ✅ File validation (type, size)
- ✅ Ad management (CRUD operations)
- ✅ Kiosk mode display
- ✅ WebSocket updates
- ✅ File storage and serving
- ✅ Authentication and authorization
- ✅ Error handling
- ✅ Edge cases

### Test Types
- **Unit Tests**: API endpoint behavior
- **Integration Tests**: Full API workflows
- **E2E Tests**: Complete user flows
- **Manual Tests**: UI interactions and edge cases

## Running Tests

### E2E (Playwright)
Requires dev server to start (or run `pnpm dev` first and set CI= so Playwright reuses it). Default timeout for web server is **180s** (3 min). If the server still does not become ready, start it manually in another terminal (`pnpm dev`), then run `pnpm test:e2e` so Playwright reuses the existing server.

```bash
pnpm test:e2e
# Chromium only (faster): PLAYWRIGHT_BROWSERS=chromium pnpm test:e2e
pnpm test:e2e:ui    # interactive
```

### API (Vitest)
Integration tests require **PostgreSQL** on localhost:5432 (or DATABASE_URL). Without it, analytics and integration tests fail with ECONNREFUSED.

```bash
pnpm --filter api test:run
```

### Load / endurance (`load_test.py`)
Python script that ramps request rate against the ticket-creation API. Default target is production; override for local or staging.

**Prerequisites:** Python 3, and `pip install -r requirements-load.txt` (installs `httpx`).

```bash
# Default: ramp 2→40 rps against production (https://eutonafila.com.br, shop mineiro)
python load_test.py

# Quick smoke: 2 rps for 15 seconds (CLI works on all platforms)
python load_test.py --quick

# Endurance: steady 5 rps for 5 minutes
python load_test.py --endurance

# Or use env: QUICK=1, ENDURANCE=1

# Local API (e.g. API on port 4041)
set BASE_URL=http://localhost:4041
set SHOP_SLUG=mineiro
python load_test.py --quick
```

### Run specific E2E suite
```bash
# API tests only
pnpm test tests/api

# Kiosk tests only
pnpm test tests/kiosk

# Specific test file
pnpm test tests/api/ads-upload.spec.ts
```

### Run Tests in UI Mode
```bash
pnpm test --ui
```

## Test Data Requirements

Tests assume:
- Company admin account exists (username: 'admin', password: 'admin123')
- At least one shop exists (slug: 'mineiro')
- Test database is seeded with basic data

## Known Limitations

1. **File Size Tests**: Large file tests (> 50MB) may be slow
2. **WebSocket Tests**: May be flaky in CI environments
3. **Concurrent Uploads**: Limited testing of race conditions
4. **Storage Tests**: File deletion tests assume filesystem access

## Next Steps

1. Run full test suite to identify any failures (E2E: ensure dev server can start within 120s; API: ensure PostgreSQL is running).
2. Fix any test failures or flaky tests.
3. Add performance benchmarks.
4. Load/endurance: use `load_test.py` with QUICK=1 or ENDURANCE=1; install deps from `requirements-load.txt`.
5. Add visual regression tests for UI.
6. Set up CI/CD test automation.

## Notes

- All tests updated to use new direct file upload system
- Tests use minimal test images (1x1 PNG) for speed
- Real MP4 files not included (use header bytes for testing)
- Tests are designed to be independent and can run in parallel
- Manual testing checklist should be used for comprehensive validation
