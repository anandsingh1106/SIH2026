/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Warm surface system ──────────────────────────────────────────
        // Every surface reads off a CSS variable so the whole palette can be
        // retuned from globals.css without touching component code.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',

        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
        },

        // Teal stays the trust anchor — it is what makes this read as health.
        gov: {
          50: '#f0fdf9',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },

        // Saffron/marigold — the warmth. Used for accents, highlights, CTAs.
        saffron: {
          50: '#fef8ee',
          100: '#fdedd3',
          200: '#fad7a5',
          300: '#f6bb6d',
          400: '#f19733',
          500: '#e8871e',
          600: '#d96e14',
          700: '#b45412',
          800: '#904316',
          900: '#753815',
          950: '#3f1b08',
        },

        // Cool, faintly green-tinted neutrals. Kept under the `sand` name
        // because ~570 call sites across the app already reference this scale;
        // retuning the values here restyles all of them at once, where a
        // rename would mean touching a hundred files for no visual gain.
        // The dark end (800-950) is what the sidebar and overlays sit on, so
        // it runs into forest green rather than brown.
        sand: {
          50: '#faf9f6',
          100: '#f6f5f1',
          200: '#e7e5df',
          300: '#d4d1c8',
          400: '#a8a89f',
          500: '#7c8682',
          600: '#525c59',
          700: '#0f4a39',
          800: '#0d4133',
          900: '#0b3d2e',
          950: '#082e23',
        },

        // The navigation shell. Exposed as its own token so a sidebar never
        // has to spell the hex out, and so it can move independently of the
        // neutral scale later.
        shell: {
          DEFAULT: 'rgb(var(--shell) / <alpha-value>)',
          deep: 'rgb(var(--shell-deep) / <alpha-value>)',
        },

        brand: {
          emerald: '#064e3b',
          teal: '#0f766e',
          sky: '#0284c7',
          amber: '#d97706',
          saffron: '#e8871e',
          danger: '#dc2626',
        },
      },

      // Rounder, softer shapes — approachable rather than corporate.
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      // Larger base sizing — readable for low-literacy and older users, and
      // for ASHA workers holding a phone at arm's length in daylight.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
        sm: ['0.9063rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.3125rem', { lineHeight: '1.9rem' }],
      },

      // Warm-tinted shadows. A neutral-black shadow over a warm surface reads
      // grey and kills the warmth, so every shadow carries a brown cast.
      // Cool-cast shadows. A warm brown shadow over this green-tinted ground
      // reads muddy, so every shadow is thrown in the same ink as the text.
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(28, 34, 32, 0.04)',
        'card': '0 1px 3px rgba(28, 34, 32, 0.06), 0 1px 2px -1px rgba(28, 34, 32, 0.04)',
        'elevated': '0 4px 12px -2px rgba(28, 34, 32, 0.10), 0 2px 6px -2px rgba(28, 34, 32, 0.06)',
        'soft': '0 2px 8px -2px rgba(15, 118, 110, 0.10), 0 10px 28px -12px rgba(28, 34, 32, 0.12)',
        'glow': '0 0 0 1px rgba(15, 118, 110, 0.08), 0 10px 28px -8px rgba(15, 118, 110, 0.26)',
        'glow-saffron': '0 0 0 1px rgba(232, 135, 30, 0.12), 0 10px 28px -8px rgba(232, 135, 30, 0.30)',
        'premium': '0 1px 2px rgba(28, 34, 32, 0.04), 0 14px 30px -12px rgba(28, 34, 32, 0.18)',
      },

      backgroundImage: {
        'trust-line': 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 40%, #e8871e 100%)',
        'warm-hero': 'linear-gradient(180deg, #f0fdf9 0%, #faf9f6 55%, #ffffff 100%)',
        'grid-pattern': 'radial-gradient(circle, rgba(15,118,110,0.14) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '22px 22px',
      },

      // Motion: tasteful and fast — 150-250ms, nothing springy or showy.
      transitionDuration: {
        DEFAULT: '180ms',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 180ms ease-out both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'shimmer': 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
