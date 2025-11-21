# Aesthetic Consistency Plan - Remove Overlays & Glass Effects

## Overview
Update all components to match the new sharp, minimal, bold aesthetic. Remove all glass-morphism, backdrop filters, overlays, and rounded elements in favor of a clean, angular, high-contrast design.

---

## Design Principles

### Core Aesthetic
- **Sharp & Angular**: No rounded corners (border-radius: 0)
- **High Contrast**: Pure colors, no transparency overlays
- **Bold Typography**: Large, heavy weights, uppercase where appropriate
- **Solid Backgrounds**: No gradients, no blur effects
- **Minimal Shadows**: Sharp, defined shadows only
- **No Overlays**: Remove backdrop-filter, blur, glass effects

---

## 1. Management Mode Updates

### Header Component
**Current Issues:**
- Uses `backdrop-filter: blur(20px)`
- Has `border-radius: var(--radius-xl)` (24px)
- Uses `rgba(255, 255, 255, 0.95)` (semi-transparent)

**Updates:**
- Remove `backdrop-filter: blur(20px)`
- Change `border-radius: 0` (sharp corners)
- Use solid `background: #FFFFFF`
- Add bold border (3px solid) instead of shadow
- Left-align content, add bottom border divider

### Queue Section
**Current Issues:**
- Uses `backdrop-filter: blur(20px)`
- Has rounded corners
- Semi-transparent background

**Updates:**
- Remove backdrop-filter
- `border-radius: 0`
- Solid white background
- Bold border (2px solid)
- Sharp, angular design

### Queue Cards
**Current Issues:**
- Rounded corners (`border-radius: var(--radius-lg)`)
- Gradient backgrounds
- Soft shadows

**Updates:**
- `border-radius: 0`
- Solid background colors
- Bold left border accent (4px solid gold)
- Sharp shadows
- Angular design matching kiosk cards

### Position Badges
**Current Issues:**
- Rounded corners (`border-radius: var(--radius-md)`)
- Gradient backgrounds

**Updates:**
- `border-radius: 0`
- Angular clip-path (polygon shape)
- Solid colors
- Black text on gold background

### Barber Avatars
**Current Issues:**
- Circular (`border-radius: 50%`)
- Gradient backgrounds
- Soft shadows

**Updates:**
- Square with sharp corners (`border-radius: 0`)
- Solid backgrounds
- Bold borders (3px solid)
- Angular design

### Action Buttons
**Current Issues:**
- Rounded (`border-radius: var(--radius-md)`)
- Gradient backgrounds
- Soft shadows

**Updates:**
- `border-radius: 0`
- Solid backgrounds
- Bold borders
- Sharp, angular design

### Empty State
**Current Issues:**
- Soft styling
- Rounded elements

**Updates:**
- Sharp, bold typography
- Angular icon containers
- High contrast

---

## 2. Kiosk Mode Updates

### Kiosk Queue View
**Current Issues:**
- Some cards may still have rounded corners
- Backdrop filters on some elements

**Updates:**
- Ensure all `border-radius: 0`
- Remove any remaining backdrop-filter
- Pure black background (already done)
- Sharp, angular cards (already done)

### Kiosk Header
**Current Status:** ✅ Already updated
- No logo animation
- Left-aligned
- Bold typography
- Bottom border divider

### Kiosk Cards
**Current Status:** ✅ Mostly updated
- Need to verify all have `border-radius: 0`
- Ensure no backdrop-filter remains
- Verify sharp left border accent

### Kiosk Position Badges
**Current Status:** ✅ Already updated
- Angular clip-path
- Sharp design

### Kiosk Barber Selector
**Current Issues:**
- Uses `backdrop-filter: blur(30px)`
- Has `border-radius: var(--radius-xl)`
- Gradient background with transparency

**Updates:**
- Remove `backdrop-filter: blur(30px)`
- `border-radius: 0`
- Solid black background `#000000`
- Bold gold border (4px solid)
- Sharp, angular design

### Kiosk Back Button
**Current Issues:**
- Uses `backdrop-filter: blur(30px)`
- Has `border-radius: var(--radius-lg)`
- Gradient background

**Updates:**
- Remove `backdrop-filter: blur(30px)`
- `border-radius: 0`
- Solid black background
- Bold gold border (4px solid)
- Angular design

### Kiosk Hidden Indicator
**Current Issues:**
- Uses `backdrop-filter: blur(10px)`
- Has `border-radius: var(--radius-lg)`
- Semi-transparent background

**Updates:**
- Remove `backdrop-filter: blur(10px)`
- `border-radius: 0`
- Solid background color
- Bold border
- Angular design

### Kiosk Atender Button
**Current Issues:**
- May have rounded corners
- Soft styling

**Updates:**
- `border-radius: 0`
- Solid backgrounds
- Bold borders
- Angular design

### Kiosk Remove Button
**Current Issues:**
- Has `border-radius: 6px`
- Gradient background

**Updates:**
- `border-radius: 0`
- Solid red background
- Angular design

---

## 3. Modal & Overlay Components

### Remove Confirmation Modal
**Current Issues:**
- Uses backdrop-filter on backdrop
- Rounded corners
- Glass-morphism effects

**Updates:**
- Remove backdrop blur
- Solid black backdrop (rgba(0, 0, 0, 0.9))
- `border-radius: 0` on modal
- Solid white/black background
- Bold gold border (4px solid)
- Angular design

### Custom Modals (if any)
**Current Issues:**
- Backdrop filters
- Rounded corners
- Glass effects

**Updates:**
- Remove all backdrop-filter
- `border-radius: 0`
- Solid backgrounds
- Bold borders
- Angular design

---

## 4. Button Components

### Primary Buttons
**Updates:**
- `border-radius: 0`
- Solid gold background (no gradient)
- Bold borders
- Sharp shadows

### Danger Buttons
**Updates:**
- `border-radius: 0`
- Solid red background
- Bold borders
- Angular design

### Icon Buttons
**Updates:**
- Square instead of circular
- `border-radius: 0`
- Bold borders
- Angular design

---

## 5. Form Elements (if any)

### Input Fields
**Updates:**
- `border-radius: 0`
- Solid backgrounds
- Bold borders (2px solid)
- Angular design

### Select/Dropdown
**Updates:**
- `border-radius: 0`
- Solid backgrounds
- Bold borders
- Angular design

---

## 6. Typography Updates

### Headers
**Updates:**
- Bolder weights (700-900)
- Larger sizes where appropriate
- Uppercase for emphasis
- Sharp, clean styling

### Body Text
**Updates:**
- High contrast colors
- No transparency
- Clear hierarchy

---

## 7. Color & Background Updates

### Remove All:
- `backdrop-filter: blur()`
- `rgba()` with opacity < 1.0 (use solid colors)
- Gradient backgrounds (use solid colors)
- Glass-morphism effects

### Use Instead:
- Solid hex colors (#FFFFFF, #000000, #D4AF37)
- Bold borders for definition
- Sharp shadows for depth
- High contrast

---

## 8. Animation Updates

### Remove:
- Floating animations
- Shimmer effects
- Pulse animations (except serving status)
- Soft transitions

### Keep:
- Sharp, quick transitions
- Horizontal slide (translateX)
- Scale on active states
- Simple fade-ins

---

## 9. Shadow Updates

### Current:
- Soft, blurred shadows
- Multiple shadow layers
- Colored shadows

### New:
- Sharp, defined shadows
- Single shadow layer
- High contrast
- `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4)` (sharp, dark)

---

## 10. Border Updates

### Current:
- Thin borders (1-2px)
- Rounded corners
- Soft colors

### New:
- Bold borders (3-4px)
- Sharp corners (0px radius)
- High contrast colors
- Left border accents on cards

---

## Implementation Checklist

### Management Mode
- [ ] Remove backdrop-filter from header
- [ ] Change header border-radius to 0
- [ ] Update header to solid background
- [ ] Remove backdrop-filter from queue section
- [ ] Change queue section border-radius to 0
- [ ] Update queue cards to angular design
- [ ] Update position badges to angular
- [ ] Update barber avatars to square
- [ ] Update action buttons to angular
- [ ] Update empty state styling

### Kiosk Mode
- [ ] Remove backdrop-filter from barber selector
- [ ] Change barber selector border-radius to 0
- [ ] Update barber selector to solid background
- [ ] Remove backdrop-filter from back button
- [ ] Change back button border-radius to 0
- [ ] Update back button to solid background
- [ ] Remove backdrop-filter from hidden indicator
- [ ] Change hidden indicator border-radius to 0
- [ ] Update all buttons to angular
- [ ] Verify all cards have border-radius: 0
- [ ] Verify no gradients remain

### Modals & Overlays
- [ ] Remove backdrop blur from modals
- [ ] Change modal border-radius to 0
- [ ] Update modal backgrounds to solid
- [ ] Add bold borders to modals
- [ ] Update modal buttons to angular

### Global
- [ ] Search for all `backdrop-filter` and remove
- [ ] Search for all `border-radius` > 0 and set to 0
- [ ] Replace all `rgba()` with opacity < 1.0
- [ ] Replace gradients with solid colors
- [ ] Update all shadows to sharp, defined
- [ ] Verify high contrast throughout
- [ ] Test on all screen sizes

---

## Visual Consistency Rules

1. **No Rounded Corners**: All `border-radius: 0`
2. **No Blur Effects**: Remove all `backdrop-filter`
3. **Solid Colors Only**: No transparency, no gradients
4. **Bold Borders**: 3-4px solid borders for definition
5. **Sharp Shadows**: Single, defined shadow layers
6. **High Contrast**: Pure black, white, gold
7. **Angular Design**: Sharp, geometric shapes
8. **Bold Typography**: Heavy weights, large sizes
9. **Left Border Accents**: Cards use left border for emphasis
10. **Minimal Animations**: Quick, sharp transitions only

---

## Testing Checklist

- [ ] All components render without rounded corners
- [ ] No blur effects visible
- [ ] All backgrounds are solid colors
- [ ] High contrast maintained throughout
- [ ] Angular design consistent
- [ ] Bold borders visible
- [ ] Typography is bold and clear
- [ ] Animations are sharp and quick
- [ ] Responsive design maintained
- [ ] Accessibility maintained (contrast ratios)

---

## Notes

- Maintain functionality while updating aesthetics
- Ensure touch targets remain adequate (48px minimum)
- Keep responsive breakpoints
- Preserve accessibility standards
- Test on real devices
- Verify performance (removing blur should improve it)

