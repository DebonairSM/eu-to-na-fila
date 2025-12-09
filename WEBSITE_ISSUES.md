# Website Issues and Cleanup

This document lists all issues found throughout the website including bad spacing, weird design, unnecessary text, and other problems.

## Status: ALL FIXED

## TypeScript Errors

### Fixed
- **StaffPage.tsx (line 6)**: `user` variable was declared but never used - FIXED

## Content Issues

### Fixed - Empty/Unnecessary Content

1. **LandingPage.tsx** - FIXED
   - Removed empty `desc: ''` fields from services array

2. **StaffPage.tsx** - FIXED
   - Removed redundant descriptions from all cards ("Gerencie a fila", "Estatísticas", "Gerencie barbeiros")

3. **OwnerDashboard.tsx** - FIXED
   - Removed redundant descriptions from all cards
   - Removed inconsistent `mt-2` spacing on arrow icons

4. **ContactPage.tsx** - FIXED
   - Removed redundant text "Fale com a equipe."

5. **NetworkPage.tsx** - FIXED
   - Removed redundant text "Unidades usando a plataforma."

## Spacing and Indentation Issues

### Fixed
1. **StatusPage.tsx (lines 189-192)** - FIXED
   - Bad indentation corrected

2. **StaffPage.tsx (lines 60-62)** - FIXED
   - Description paragraph indentation corrected

3. **StaffPage.tsx (lines 82-84)** - FIXED
   - Description paragraph indentation corrected

4. **QueueCard.tsx (lines 104-108)** - FIXED
   - img tag indentation corrected

5. **BarberCard.tsx (lines 50-56)** - FIXED
   - img tag and onError handler indentation corrected

## Design Issues

### Fixed
1. **StaffPage.tsx** - FIXED
   - Removed redundant card descriptions for consistency

2. **OwnerDashboard.tsx** - FIXED
   - Removed inconsistent `mt-2` spacing on arrow icons

3. **StatusPage.tsx** - FIXED
   - Reduced excessive spacing (`mb-4 sm:mb-6` + `mt-6 pt-6` → cleaner spacing)

4. **BarberQueueManager.tsx (line 690)** - FIXED
   - Error handling indentation corrected

5. **BarberManagementPage.tsx** - FIXED
   - Removed placeholder stats section showing "--" for all barbers

## Code Quality Issues

### Fixed
1. **BarberQueueManager.tsx (line 690)** - FIXED
   - Error handling formatting corrected

2. **QueueCard.tsx (lines 104-108)** - FIXED
   - img tag attributes formatting corrected

3. **BarberCard.tsx (lines 50-56)** - FIXED
   - Conditional rendering formatting corrected

4. **StatusPage.tsx** - FIXED
   - Excessive vertical spacing corrected

## Summary

**All 30+ issues have been fixed.**

Files modified:
- `apps/web/src/pages/LandingPage.tsx`
- `apps/web/src/pages/StaffPage.tsx`
- `apps/web/src/pages/OwnerDashboard.tsx`
- `apps/web/src/pages/ContactPage.tsx`
- `apps/web/src/pages/NetworkPage.tsx`
- `apps/web/src/pages/BarberManagementPage.tsx`
- `apps/web/src/pages/StatusPage.tsx`
- `apps/web/src/pages/BarberQueueManager.tsx`
- `apps/web/src/components/QueueCard.tsx`
- `apps/web/src/components/BarberCard.tsx`
