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

        // Blue is the trust anchor — the most widely used signal in clinical
        // software, and what makes this read as healthcare rather than as a
        // generic SaaS dashboard. 600/700 are the interactive weights.
        gov: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
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
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#6b7280',
          600: '#475569',
          700: '#1e3a5f',
          800: '#163051',
          900: '#0f2144',
          950: '#0a1732',
        },

        // The navigation shell. Exposed as its own token so a sidebar never
        // has to spell the hex out, and so it can move independently of the
        // neutral scale later.
        shell: {
          DEFAULT: 'rgb(var(--shell) / <alpha-value>)',
          deep: 'rgb(var(--shell-deep) / <alpha-value>)',
        },

        brand: {
          emerald: '#1e3a8a',
          teal: '#2563eb',
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
        'subtle': '0 1px 2px 0 rgba(31, 41, 55, 0.04)',
        'card': '0 1px 3px rgba(31, 41, 55, 0.06), 0 1px 2px -1px rgba(31, 41, 55, 0.04)',
        'elevated': '0 4px 12px -2px rgba(31, 41, 55, 0.10), 0 2px 6px -2px rgba(31, 41, 55, 0.06)',
        'soft': '0 2px 8px -2px rgba(37, 99, 235, 0.10), 0 10px 28px -12px rgba(31, 41, 55, 0.12)',
        'glow': '0 0 0 1px rgba(37, 99, 235, 0.08), 0 10px 28px -8px rgba(37, 99, 235, 0.26)',
        'glow-saffron': '0 0 0 1px rgba(96, 165, 250, 0.14), 0 10px 28px -8px rgba(96, 165, 250, 0.32)',
        'premium': '0 1px 2px rgba(31, 41, 55, 0.04), 0 14px 30px -12px rgba(31, 41, 55, 0.18)',
      },

      backgroundImage: {
        'trust-line': 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 45%, #60a5fa 100%)',
        'warm-hero': 'linear-gradient(180deg, #eff6ff 0%, #f0f7ff 55%, #ffffff 100%)',
        'grid-pattern': 'radial-gradient(circle, rgba(37,99,235,0.13) 1px, transparent 1px)',
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
