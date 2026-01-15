# Manual Testing Checklist for Ad Upload/Display System

## Prerequisites
- API server running on `http://localhost:4041`
- Web app running on `http://localhost:4040` (or configured port)
- Company admin account created
- At least one shop configured

## 1. File Upload Functionality

### Image Upload
- [ ] Upload PNG image (< 50MB)
- [ ] Upload JPEG image (< 50MB)
- [ ] Upload WebP image (< 50MB)
- [ ] Upload video MP4 (< 50MB)
- [ ] Verify upload progress indicator shows
- [ ] Verify success message appears after upload
- [ ] Verify ad appears in ad list immediately after upload

### File Validation
- [ ] Try uploading file > 50MB (should show error)
- [ ] Try uploading invalid file type (e.g., .txt) (should show error)
- [ ] Try uploading without selecting file (should show error)
- [ ] Verify error messages are clear and helpful

### Upload Options
- [ ] Upload with shopId specified
- [ ] Upload without shopId (company-wide)
- [ ] Upload with position specified
- [ ] Upload without position (auto-assign)
- [ ] Upload multiple ads sequentially

## 2. Ad Management UI

### Page Load
- [ ] Ad Management page loads correctly
- [ ] Ad list displays all existing ads
- [ ] Empty state shows when no ads exist
- [ ] Loading state shows while fetching ads

### Ad Display
- [ ] Ad thumbnails display correctly (images)
- [ ] Ad thumbnails display correctly (videos)
- [ ] File size displays in readable format (KB/MB)
- [ ] MIME type displays correctly
- [ ] Position number displays correctly
- [ ] Enabled/disabled status shows correctly

### Ad Actions
- [ ] Enable toggle works (disabled → enabled)
- [ ] Disable toggle works (enabled → disabled)
- [ ] Delete button works (with confirmation)
- [ ] Success message shows after actions
- [ ] Error message shows if action fails

### Upload Form
- [ ] File input accepts correct file types
- [ ] File input rejects invalid file types
- [ ] Upload button is disabled during upload
- [ ] Progress bar shows upload progress
- [ ] Form resets after successful upload

## 3. Kiosk Mode Display

### Ad Loading
- [ ] Kiosk mode loads without errors
- [ ] Manifest fetches successfully
- [ ] Ads display in rotation
- [ ] "No ads" message shows when no ads exist
- [ ] Loading state shows while fetching manifest

### Ad Display
- [ ] Image ads display correctly
- [ ] Video ads play automatically
- [ ] Videos are muted and looped
- [ ] Ads maintain aspect ratio (object-contain)
- [ ] Ads are centered in container
- [ ] Fullscreen works correctly

### Ad Rotation
- [ ] Ads rotate on schedule
- [ ] Multiple ads cycle correctly
- [ ] Rotation returns to queue view
- [ ] Rotation can be paused by clicking

### Cache Busting
- [ ] Ad URLs include version query param (`?v=X`)
- [ ] Updated ads show new version in URL
- [ ] Browser cache is bypassed correctly

## 4. WebSocket Updates

### Real-time Updates
- [ ] Upload new ad → kiosk updates automatically
- [ ] Enable/disable ad → kiosk updates automatically
- [ ] Delete ad → kiosk updates automatically
- [ ] Update ad position → kiosk updates automatically
- [ ] WebSocket reconnects if connection drops

### Manifest Version
- [ ] Manifest version increments on updates
- [ ] Version calculation is correct (sum of ad versions)
- [ ] Version is included in WebSocket events

## 5. File Storage and Serving

### File Storage
- [ ] Files saved to `public/companies/<id>/ads/`
- [ ] Directory created if doesn't exist
- [ ] Files named correctly (`<ad-id>.<ext>`)
- [ ] Files deleted from disk when ad deleted

### File Serving
- [ ] Images accessible via `/companies/<id>/ads/<file>`
- [ ] Videos accessible via `/companies/<id>/ads/<file>`
- [ ] Files load in browser without errors
- [ ] Static file serving works correctly
- [ ] Cache headers set correctly

## 6. API Endpoints

### Authentication
- [ ] Upload requires authentication (401 without token)
- [ ] Upload requires company admin role (403 for non-admin)
- [ ] List ads requires authentication
- [ ] Update ad requires authentication
- [ ] Delete ad requires authentication
- [ ] Manifest endpoint is public (no auth required)

### Validation
- [ ] Invalid file type returns 400
- [ ] File too large returns 400
- [ ] Missing file returns 400
- [ ] Invalid shopId returns 400
- [ ] Non-existent ad returns 404

## 7. Content Security Policy

### CSP Compliance
- [ ] No CSP violations in browser console
- [ ] Images load without CSP errors
- [ ] Videos load without CSP errors
- [ ] WebSocket connections work
- [ ] No blocked resources

## 8. Error Handling

### Network Errors
- [ ] Upload fails gracefully on network error
- [ ] Error message displays clearly
- [ ] Retry is possible after error
- [ ] No infinite loading states

### Server Errors
- [ ] 500 errors handled gracefully
- [ ] Error messages are user-friendly
- [ ] No stack traces exposed to user

## 9. Edge Cases

### Large Files
- [ ] Upload file near 50MB limit works
- [ ] Upload file exactly at 50MB limit works
- [ ] Upload file just over 50MB limit fails

### Many Ads
- [ ] Upload 10+ ads works correctly
- [ ] Ad list displays all ads
- [ ] Performance is acceptable
- [ ] No memory leaks

### Special Cases
- [ ] Delete all ads (empty state)
- [ ] Upload same file twice (different records)
- [ ] Upload with special characters in filename
- [ ] Concurrent uploads from multiple tabs

## 10. Cross-Browser Testing

### Chrome
- [ ] All functionality works
- [ ] No console errors
- [ ] UI displays correctly

### Firefox
- [ ] All functionality works
- [ ] No console errors
- [ ] UI displays correctly

### Safari
- [ ] All functionality works
- [ ] No console errors
- [ ] UI displays correctly

## 11. Mobile Testing

### Responsive Design
- [ ] Ad Management page works on mobile
- [ ] Upload form is usable on mobile
- [ ] Ad list displays correctly
- [ ] Kiosk mode works on mobile
- [ ] Touch interactions work

## 12. Performance

### Upload Performance
- [ ] Small files (< 1MB) upload in < 2s
- [ ] Medium files (1-10MB) upload in < 10s
- [ ] Large files (10-50MB) upload in < 30s
- [ ] Progress indicator updates smoothly

### Display Performance
- [ ] Kiosk loads in < 2s
- [ ] Ad rotation is smooth
- [ ] No lag when switching ads
- [ ] Memory usage is reasonable

## Notes
- Test on both local development and production environments
- Test with different file sizes and types
- Test with different network conditions (slow 3G, offline)
- Document any issues found during testing
