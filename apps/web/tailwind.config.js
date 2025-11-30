/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        sm: '8px',   // Small buttons, badges
        md: '12px',  // Cards, inputs, buttons
        lg: '16px',  // Large cards, headers
        xl: '24px',  // Modals
        '2xl': '28px', // Large modals
        full: '100px', // Pill buttons
        round: '50%',  // Circular badges
      },
      spacing: {
        // 8px base unit system
        xs: '4px',   // 0.5 * 8px
        sm: '8px',   // 1 * 8px
        md: '16px',  // 2 * 8px
        lg: '24px',  // 3 * 8px
        xl: '32px',  // 4 * 8px
        '2xl': '48px', // 6 * 8px
        '3xl': '64px', // 8 * 8px
      },
      boxShadow: {
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'elevation-3': '0 4px 16px rgba(0, 0, 0, 0.16)',
        'elevation-4': '0 8px 32px rgba(0, 0, 0, 0.20)',
      },
      transitionTimingFunction: {
        'ease-standard': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
      screens: {
        xs: '0px',
        sm: '600px',
        md: '768px',
        lg: '1024px',
        xl: '1400px',
        '2xl': '1600px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
};

