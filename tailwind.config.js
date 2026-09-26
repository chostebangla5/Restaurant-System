/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      xs: '420px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        bg: '#07080B',
        surface: '#0E1016',
        'surface-2': '#141721',
        border: 'rgba(255, 255, 255, 0.08)',
        text: '#F4F5F7',
        muted: '#8A8F9C',
        accent: {
          DEFAULT: '#C6FF3D',
          hover: '#b5f229',
        },
        brand: {
          primary: '#C6FF3D',
          'primary-hover': '#b5f229',
          'primary-light': 'rgba(198, 255, 61, 0.1)',
          accent: '#C6FF3D',
          dark: '#07080B',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '12px',
        card: '20px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        lift: '0 12px 30px -4px rgba(0, 0, 0, 0.6)',
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
