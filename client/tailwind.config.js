/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: {
    // We're introducing Tailwind alongside the existing hand-written
    // styles.css (still used by every page other than Header/Footer/SubNav
    // for now) — Preflight's element reset would fight with it globally.
    // Off until the whole app migrates to Tailwind.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e2136e',
          dark: '#c01159',
          light: '#fff2f8',
          soft: '#ffd2e6',
        },
        ink: '#191919',
        inksoft: '#4a4a4a',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 10px 30px rgba(25,25,25,0.12)',
      },
      maxWidth: {
        container: '1260px',
      },
    },
  },
  plugins: [],
};
