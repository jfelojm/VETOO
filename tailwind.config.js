/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#E8845A', light: '#FDF0E9', dark: '#C05F35' },
        teal: { DEFAULT: '#3AAFA9', light: '#E6F7F6', dark: '#1D7A76' },
        warm: { bg: '#FBF7F4', border: '#EDE4DC' },
        sidebar: { DEFAULT: '#2C2420', hover: '#3D3028', active: '#3D3028' },
        ink: { DEFAULT: '#2C2420', muted: '#7A6A62' },
        success: { DEFAULT: '#5BAD6A', light: '#EBF5ED' },
        warning: { DEFAULT: '#E09B2D', light: '#FDF3DF' },
        danger: { DEFAULT: '#D95C5C', light: '#FCEAEA' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
}
