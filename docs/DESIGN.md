# Design System

Visual design specifications for EuToNaFila queue management system.

## Design Philosophy

- Gold and black premium aesthetic
- Rounded corners for approachable feel
- High contrast colors
- Bold typography
- Dark mode for kiosk, light mode for customer pages
- Subtle animations for feedback

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Gold | #D4AF37 | Primary accent, borders, highlights |
| Gold Hover | #E5C047 | Hover states |
| Gold Active | #C49B2E | Active states |
| Gold Light | rgba(212, 175, 55, 0.1) | Backgrounds |

### Surface Colors

| Name | Hex | Usage |
|------|-----|-------|
| White | #FFFFFF | Light mode background |
| Surface Variant | #F8F9FA | Subtle backgrounds |
| Black | #0A0A0A | Kiosk mode background |
| Charcoal | #1A1A1A | Dark surfaces |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| On Surface | #1A1A1A | Primary text |
| On Surface Variant | #6B7280 | Secondary text |
| On Surface Disabled | #9CA3AF | Disabled text |
| On Primary | #FFFFFF | Text on gold |

### Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Success | #10B981 | Serving, completed |
| Error | #EF4444 | Remove, cancel |
| Warning | #F59E0B | Alerts |

### Alternative Theme (Victorian)

| Name | Hex | Usage |
|------|-----|-------|
| Deep Burgundy | #8B2635 | Primary accent |
| Antique Gold | #C9A961 | Secondary accent |
| Cream | #F5F1E8 | Background |
| Navy Blue | #2C3E50 | Secondary background |

---

## Typography

### Font Scale (8px base)

| Level | Size | Line Height | Weight |
|-------|------|-------------|--------|
| H1 | 32px (2rem) | 1.2 | 700 |
| H2 | 24px (1.5rem) | 1.3 | 600 |
| H3 | 20px (1.25rem) | 1.4 | 600 |
| Body Large | 18px (1.125rem) | 1.5 | 400 |
| Body | 16px (1rem) | 1.5 | 400 |
| Body Small | 14px (0.875rem) | 1.5 | 400 |
| Caption | 12px (0.75rem) | 1.4 | 400 |
| Label | 12px (0.75rem) | 1.4 | 500 |

### Kiosk Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Title | 64px (4rem) | 900 | Uppercase |
| Subtitle | 20px (1.25rem) | 300 | Letter-spacing: 2px |
| Customer Name | 28px (1.75rem) | 600 | - |
| Position Badge | 24px (1.5rem) | 700 | - |

---

## Spacing System

Base unit: 8px

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Small gaps |
| md | 16px | Default gaps |
| lg | 24px | Section spacing |
| xl | 32px | Large spacing |
| 2xl | 48px | Section margins |
| 3xl | 64px | Page margins |

### Component Spacing

| Component | Padding |
|-----------|---------|
| Container | 24px |
| Card | 20px |
| Button | 12px 24px |
| Icon Button | 48px × 48px |

---

## Component Sizing

### Badges & Avatars

| Element | Size | Border Radius |
|---------|------|---------------|
| Position Badge (Management) | 52px × 52px | 12px |
| Position Badge (Kiosk) | 56px × 56px | 50% (circle) |
| Barber Avatar (Management) | 40px × 40px | 12px |
| Barber Avatar (Kiosk Selector) | 56px × 56px | 12px |

### Buttons

| Type | Height | Padding | Border Radius |
|------|--------|---------|---------------|
| Primary | 48px | 12px 24px | 12px |
| Icon Button | 48px × 48px | - | 12px |
| Small Button | 40px | 10px 20px | 8px |
| Pill Button | 48px | 16px 24px | 100px |

### Cards

| Element | Padding | Border | Border Radius |
|---------|---------|--------|---------------|
| Queue Card (Management) | 24px | 2px solid | 12px |
| Queue Card (Kiosk) | 28px 36px | 1px solid | 16px |
| Header Card | 24px | 3px solid | 16px |
| Modal | 40px | 2px solid | 28px |

---

## Borders

### Border Widths

| Usage | Width |
|-------|-------|
| Default | 1-2px |
| Emphasis | 3-4px |
| Left accent | 4px |

### Border Colors

| State | Color |
|-------|-------|
| Default | rgba(0, 0, 0, 0.08) |
| Hover | rgba(212, 175, 55, 0.4) |
| Active | rgba(212, 175, 55, 0.6) |
| Kiosk | rgba(212, 175, 55, 0.3) |

### Border Radius Scale

| Token | Size | Usage |
|-------|------|-------|
| sm | 8px | Small buttons, badges |
| md | 12px | Cards, inputs, buttons |
| lg | 16px | Large cards, headers |
| xl | 24px | Modals |
| 2xl | 28px | Large modals |
| full | 100px | Pill buttons |
| round | 50% | Circular badges |

---

## Shadows

### Elevation Scale

| Level | Shadow |
|-------|--------|
| 0 | None |
| 1 | 0 1px 3px rgba(0, 0, 0, 0.12) |
| 2 | 0 2px 8px rgba(0, 0, 0, 0.12) |
| 3 | 0 4px 16px rgba(0, 0, 0, 0.16) |
| 4 | 0 8px 32px rgba(0, 0, 0, 0.20) |

Use sharp, defined shadows only. No soft blurs.

---

## Icons

### Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| Small | 16px | Inline text |
| Medium | 20px | Buttons |
| Large | 24px | Headers |
| XLarge | 32px | Emphasis |
| XXLarge | 48px | Kiosk mode |

### Icon Style

- Use outlined icons (Material Symbols)
- 8px gap from text
- Vertically centered with text

---

## Animations

### Timing

| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | 150ms | Micro-interactions |
| Normal | 250ms | Standard interactions |
| Slow | 400ms | Page transitions |

### Easing

```css
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
```

### Allowed Animations

- Horizontal slide (translateX)
- Scale on active states
- Simple fade-ins
- Serving pulse (2s ease-in-out infinite)

### Removed Effects

- Floating animations
- Shimmer effects
- Backdrop blur
- Glass-morphism

---

## Responsive Breakpoints

| Name | Width | Columns (Kiosk) |
|------|-------|-----------------|
| xs | 0-599px | 1 |
| sm | 600-767px | 1 |
| md | 768-1023px | 2 |
| lg | 1024-1399px | 2 |
| xl | 1400-1599px | 2 |
| 2xl | 1600-1919px | 3 |
| 3xl | 1920px+ | 3 |

### Adaptive Rules

- Fonts: Scale down 10-15% on mobile
- Spacing: Reduce by 25% on mobile
- Touch targets: Minimum 48px

---

## Management Mode

### Header

- Background: #FFFFFF (solid)
- Border: 2px solid bottom
- Padding: 24px
- No backdrop-filter

### Queue Cards

- Background: White
- Border: 2px solid
- Left accent: 4px solid gold
- Hover: translateY(-2px)

### Buttons

- Primary: Gold background, white text
- Danger: Transparent, red border

---

## Kiosk Mode

### Background

- Base: #0A0A0A (near black)
- No gradient overlays

### Header

- Title: 64px, weight 900
- Bottom border divider
- No logo animation

### Cards

- Grid: 3 columns (large), 2 columns (medium), 1 column (small)
- Gap: 16px
- Border: 2px solid gold
- Shadow: Level 4 with gold glow

### Barber Selector

- Position: Fixed bottom
- Background: #000000 (solid)
- Border: 4px solid gold (top)
- No backdrop-filter

### Back Button

- Position: Fixed top-left
- Background: #000000 (solid)
- Border: 4px solid gold
- Size: padding 16px 24px

---

## Accessibility

### Contrast Requirements

- Text on background: Minimum 4.5:1 ratio
- Large text: Minimum 3:1 ratio
- Interactive elements: Clear focus states

### Focus States

- Outline: 2px solid primary color
- Offset: 2px from element
- Border radius: Match element

### Touch Targets

- Minimum size: 48px × 48px
- Adequate spacing between targets

---

## Implementation Notes

1. Consistent border-radius per component type (see scale above)
2. Subtle backdrop-filter blur on modals for depth
3. Gold gradient on primary buttons and accent cards
4. Dark backgrounds for kiosk mode (#0A0A0A, #1A1A1A)
5. Light backgrounds for customer pages (#FFFFFF, #F8F9FA)
6. High contrast maintained throughout
7. Test on real devices and various screen sizes
