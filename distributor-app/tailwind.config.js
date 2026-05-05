/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F59E0B',
          container: '#f59e0b',
          fixed: '#ffddb8',
          'fixed-dim': '#ffb95f'
        },
        surface: {
          DEFAULT: '#fff8f4',
          dim: '#e7d7c9',
          bright: '#fff8f4',
          container: '#fbebdd',
          'container-lowest': '#ffffff',
          'container-low': '#fff1e5',
          'container-high': '#f5e6d7',
          'container-highest': '#f0e0d1',
          variant: '#f0e0d1',
          tint: '#855300'
        },
        secondary: {
          DEFAULT: '#575e70',
          container: '#d9dff5',
          fixed: '#dce2f7',
          'fixed-dim': '#c0c6db'
        },
        tertiary: {
          DEFAULT: '#00658b',
          container: '#1abdff',
          fixed: '#c5e7ff',
          'fixed-dim': '#7fd0ff'
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6'
        },
        outline: {
          DEFAULT: '#867461',
          variant: '#d8c3ad'
        },
        background: '#fff8f4',
        'on-primary': '#ffffff',
        'on-primary-container': '#613b00',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#5c6274',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#004966',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'on-background': '#221a12',
        'on-surface': '#221a12',
        'on-surface-variant': '#534434',
        'inverse-surface': '#382f25',
        'inverse-on-surface': '#feeedf',
        'inverse-primary': '#ffb95f'
      },
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0px 4px 20px rgba(0, 0, 0, 0.03)',
        'modal': '0px 10px 30px rgba(0, 0, 0, 0.08)'
      }
    },
  },
  plugins: [],
}
