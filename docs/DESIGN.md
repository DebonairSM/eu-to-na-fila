# Design System

Visual design specifications for EuToNaFila queue management system.

## Status: ✅ Complete

All design components are implemented in production.

## Design Philosophy

- Gold and black premium aesthetic
- High contrast colors
- Rounded corners for approachable feel
- Bold typography
- Dark mode for kiosk, light mode for customer
- Subtle animations for feedback

## Color Palette

### Primary
- Gold: `#D4AF37`
- Gold Hover: `#E5C047`
- Gold Active: `#C49B2E`
- Gold Light: `rgba(212, 175, 55, 0.1)`

### Surface
- White: `#FFFFFF`
- Surface Variant: `#F8F9FA`
- Black: `#0A0A0A`
- Charcoal: `#1A1A1A`

### Text
- On Surface: `#1A1A1A`
- On Surface Variant: `#6B7280`
- On Surface Disabled: `#9CA3AF`
- On Primary: `#FFFFFF`

### Status
- Success: `#10B981`
- Error: `#EF4444`
- Warning: `#F59E0B`

## Typography

### Font Scale (8px base)

| Level | Size | Line Height | Weight |
|-------|------|-------------|--------|
| H1 | 32px | 1.2 | 700 |
| H2 | 24px | 1.3 | 600 |
| H3 | 20px | 1.4 | 600 |
| Body Large | 18px | 1.5 | 400 |
| Body | 16px | 1.5 | 400 |
| Body Small | 14px | 1.5 | 400 |
| Caption | 12px | 1.4 | 400 |
| Label | 12px | 1.4 | 500 |

### Kiosk Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Title | 64px | 900 | Uppercase |
| Subtitle | 20px | 300 | Letter-spacing: 2px |
| Customer Name | 28px | 600 | - |
| Position Badge | 24px | 700 | - |

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

## Component Sizing

### Badges & Avatars

| Element | Size | Border Radius |
|---------|------|---------------|
| Position Badge (Management) | 52×52px | 12px |
| Position Badge (Kiosk) | 56×56px | 50% (circle) |
| Barber Avatar (Management) | 40×40px | 12px |
| Barber Avatar (Kiosk) | 56×56px | 12px |

### Buttons

| Type | Height | Padding | Border Radius |
|------|--------|---------|---------------|
| Primary | 48px | 12px 24px | 12px |
| Icon | 48×48px | - | 12px |
| Small | 40px | 10px 20px | 8px |
| Pill | 48px | 16px 24px | 100px |

### Cards

| Element | Padding | Border | Border Radius |
|---------|---------|--------|---------------|
| Queue Card (Management) | 24px | 2px solid | 12px |
| Queue Card (Kiosk) | 28px 36px | 1px solid | 16px |
| Header Card | 24px | 3px solid | 16px |
| Modal | 40px | 2px solid | 28px |

## Borders

### Widths
- Default: 1-2px
- Emphasis: 3-4px
- Accent: 4px (left side)

### Colors
- Default: `rgba(0, 0, 0, 0.08)`
- Hover: `rgba(212, 175, 55, 0.4)`
- Active: `rgba(212, 175, 55, 0.6)`
- Kiosk: `rgba(212, 175, 55, 0.3)`

### Radius Scale

| Token | Size | Usage |
|-------|------|-------|
| sm | 8px | Small buttons, badges |
| md | 12px | Cards, inputs, buttons |
| lg | 16px | Large cards |
| xl | 24px | Modals |
| 2xl | 28px | Large modals |
| full | 100px | Pill buttons |
| round | 50% | Circular badges |

## Shadows

### Elevation Scale

| Level | Shadow |
|-------|--------|
| 0 | None |
| 1 | 0 1px 3px rgba(0,0,0,0.12) |
| 2 | 0 2px 8px rgba(0,0,0,0.12) |
| 3 | 0 4px 16px rgba(0,0,0,0.16) |
| 4 | 0 8px 32px rgba(0,0,0,0.20) |

Sharp, defined shadows only. No soft blurs.

## Icons

### Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| Small | 16px | Inline text |
| Medium | 20px | Buttons |
| Large | 24px | Headers |
| XLarge | 32px | Emphasis |
| XXLarge | 48px | Kiosk |

### Style
- Material Symbols (outlined)
- 8px gap from text
- Vertically centered

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

### Allowed
- Horizontal slide (translateX)
- Scale on active states
- Fade-ins
- Serving pulse (2s ease-in-out infinite)

### Removed
- Floating animations
- Shimmer effects
- Glass-morphism (except modals)

## Responsive Breakpoints

| Name | Width | Kiosk Columns |
|------|-------|---------------|
| xs | 0-599px | 1 |
| sm | 600-767px | 1 |
| md | 768-1023px | 2 |
| lg | 1024-1399px | 2 |
| xl | 1400-1599px | 2 |
| 2xl | 1600-1919px | 3 |
| 3xl | 1920px+ | 3 |

### Adaptive Rules
- Fonts: Scale down 10-15% on mobile
- Spacing: Reduce 25% on mobile
- Touch targets: Minimum 48px

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

## Kiosk Mode

### Background
- Base: #0A0A0A
- No gradient overlays

### Header
- Title: 64px, weight 900
- Bottom border divider
- No logo animation

### Cards
- Grid: 3 cols (large), 2 cols (medium), 1 col (small)
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
- Padding: 16px 24px

## Accessibility

### Contrast
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: Clear focus states

### Focus States
- Outline: 2px solid primary
- Offset: 2px from element
- Border radius: Match element

### Touch Targets
- Minimum: 48×48px
- Adequate spacing between targets

## Implementation Notes

1. Consistent border-radius per component type
2. Backdrop-filter blur on modals only
3. Gold gradient on primary buttons
4. Dark backgrounds for kiosk (#0A0A0A, #1A1A1A)
5. Light backgrounds for customer pages (#FFFFFF, #F8F9FA)
6. High contrast maintained throughout
7. Test on real devices
