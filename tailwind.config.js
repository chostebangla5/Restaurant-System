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
        brand: {
          primary: 'hsl(var(--brand-primary) / <alpha-value>)',
          'primary-hover': 'hsl(var(--brand-primary-hover) / <alpha-value>)',
          'primary-light': 'hsl(var(--brand-primary-light) / <alpha-value>)',
          accent: 'hsl(var(--brand-accent) / <alpha-value>)',
          dark: 'hsl(var(--brand-dark) / <alpha-value>)',
        },
        /* Royal Dhaba palette — guest-facing only */
        dhaba: {
          plum: '#2B0E14',
          'plum-light': '#3D1A22',
          'plum-surface': '#4A2230',
          ivory: '#F6EEDD',
          'ivory-warm': '#EDE3CC',
          gold: '#C9A227',
          'gold-light': '#D4B44A',
          'gold-dim': '#A68520',
          sindoor: '#A31621',
          'sindoor-hover': '#8B1019',
          green: '#1B4D3E',
          'green-light': '#246B55',
          ink: '#201512',
          'ink-muted': '#5A4D47',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Cinzel"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Work Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'float': '0 12px 40px -10px rgba(0, 0, 0, 0.15)',
        'gold': '0 2px 12px -2px rgba(201, 162, 39, 0.25)',
        'gold-lg': '0 8px 30px -4px rgba(201, 162, 39, 0.35)',
        'sindoor': '0 4px 16px -2px rgba(163, 22, 33, 0.3)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'qty-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        'cart-bounce': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '70%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        'stamp-in': {
          '0%': { transform: 'scale(2.5) rotate(-15deg)', opacity: '0' },
          '60%': { transform: 'scale(0.9) rotate(2deg)', opacity: '1' },
          '80%': { transform: 'scale(1.05) rotate(-1deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'status-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(201, 162, 39, 0.5)' },
          '70%': { boxShadow: '0 0 0 8px rgba(201, 162, 39, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(201, 162, 39, 0)' },
        },
        'slide-up-spring': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '70%': { transform: 'translateY(-4%)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'gold-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'tab-underline': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'number-roll': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'qty-pop': 'qty-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'cart-bounce': 'cart-bounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'stamp-in': 'stamp-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'status-pulse': 'status-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1)',
        'slide-up-spring': 'slide-up-spring 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'gold-shimmer': 'gold-shimmer 3s linear infinite',
        'tab-underline': 'tab-underline 0.2s ease-out forwards',
        'number-roll': 'number-roll 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
