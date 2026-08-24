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
        brand: {
          emerald: '#064e3b',
          teal: '#0f766e',
          sky: '#0284c7',
          amber: '#d97706',
          danger: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'soft': '0 2px 8px -2px rgba(15, 118, 110, 0.08), 0 10px 28px -10px rgba(15, 23, 42, 0.10)',
        'glow': '0 0 0 1px rgba(15, 118, 110, 0.06), 0 12px 32px -8px rgba(15, 118, 110, 0.28)',
        'premium': '0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 32px -12px rgba(15, 23, 42, 0.16)',
      },
      backgroundImage: {
        'trust-line': 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 45%, #d97706 100%)',
        'grid-pattern': 'radial-gradient(circle, rgba(15,118,110,0.14) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '22px 22px',
      },
    },
  },
  plugins: [],
}
