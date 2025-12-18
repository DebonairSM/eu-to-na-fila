/**
 * Design System Tokens
 * 
 * Comprehensive token system for spacing, typography, colors, elevation, radii, and motion.
 * All values follow mobile-first approach with semantic naming.
 */

// ============================================================================
// Spacing Scale (4px base unit)
// ============================================================================
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '80px',
  '5xl': '96px',
} as const;

// Spacing scale array for programmatic access
export const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const;

// ============================================================================
// Typography Scale
// ============================================================================
export const typography = {
  // Font sizes
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px', // Mobile default
    baseDesktop: '18px', // Desktop default
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '56px',
    '7xl': '64px',
  },
  // Line heights
  lineHeight: {
    tight: 1.4,
    normal: 1.5,
    relaxed: 1.6,
  },
  // Font families
  fontFamily: {
    serif: "'Playfair Display', serif",
    sans: "'Roboto', sans-serif",
    mono: "'Inter', sans-serif",
  },
} as const;

// ============================================================================
// Color Roles (Semantic, not raw hex values)
// ============================================================================
export const colors = {
  // Primary colors
  primary: {
    DEFAULT: '#D4AF37',
    hover: '#E8C547',
    active: '#C49B2E',
    light: 'rgba(212, 175, 55, 0.1)',
    medium: 'rgba(212, 175, 55, 0.2)',
    dark: 'rgba(212, 175, 55, 0.3)',
  },
  // Background colors
  bg: {
    primary: '#0a0a0a',
    secondary: '#1a1a1a',
    tertiary: '#2a2a2a',
  },
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.3)',
  },
  // Status colors
  status: {
    waiting: '#D4AF37',
    'in-progress': '#FFFFFF',
    completed: '#FFFFFF',
    error: '#ef4444',
    warning: '#F59E0B',
    success: '#FFFFFF',
  },
  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(255, 255, 255, 0.2)',
    accent: 'rgba(212, 175, 55, 0.3)',
    error: 'rgba(239, 68, 68, 0.3)',
  },
} as const;

// ============================================================================
// Elevation Levels (Shadows)
// ============================================================================
export const elevation = {
  0: 'none',
  1: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  3: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  4: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  // Gold accent shadows
  gold: {
    sm: '0 4px 20px rgba(212, 175, 55, 0.2)',
    md: '0 8px 30px rgba(212, 175, 55, 0.3)',
    lg: '0 10px 40px rgba(212, 175, 55, 0.4)',
  },
} as const;

// ============================================================================
// Border Radius
// ============================================================================
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '28px',
  full: '100%',
  round: '50%',
} as const;

// ============================================================================
// Motion (Animation Tokens)
// ============================================================================
export const motion = {
  // Durations
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
    slower: '600ms',
  },
  // Easing functions
  ease: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  // Common transitions
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================================================
// Touch Targets
// ============================================================================
export const touchTargets = {
  minimum: '44px',
  preferred: '48px',
  large: '52px',
} as const;

// ============================================================================
// Breakpoints (for reference, use Tailwind classes in practice)
// ============================================================================
export const breakpoints = {
  mobile: '320px',
  mobileMax: '767px',
  tablet: '768px',
  tabletMax: '1023px',
  desktop: '1024px',
} as const;

// ============================================================================
// Container Max Widths
// ============================================================================
export const containers = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;

// ============================================================================
// Section Layout Standards
// ============================================================================
export const section = {
  // Vertical spacing between sections
  spacing: {
    mobile: spacing['3xl'], // 64px
    desktop: spacing['5xl'], // 96px
  },
  // Section padding
  padding: {
    mobile: spacing['2xl'], // 48px
    desktop: spacing['3xl'], // 64px
  },
  // Container padding
  containerPadding: {
    mobile: spacing.md, // 16px
    tablet: spacing.lg, // 24px
    desktop: spacing.xl, // 32px
  },
} as const;

// ============================================================================
// Type exports for TypeScript
// ============================================================================
export type SpacingKey = keyof typeof spacing;
export type TypographySize = keyof typeof typography.fontSize;
export type ColorRole = keyof typeof colors;
export type ElevationLevel = keyof typeof elevation;
export type RadiusSize = keyof typeof radius;
export type MotionDuration = keyof typeof motion.duration;
export type MotionEase = keyof typeof motion.ease;
