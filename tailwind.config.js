/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          dark: 'var(--brand-dark)',
          light: 'var(--brand-light)',
          glow: 'var(--brand-glow)',
          /* Escala numérica (compat UI existente) — alineada al sistema verde */
          50: '#f0faf7',
          100: 'var(--brand-light)',
          200: '#c8ebe0',
          300: '#8fd4b9',
          400: 'var(--brand-glow)',
          500: 'var(--brand-primary)',
          600: 'var(--brand-primary)',
          700: '#0b8558',
          800: 'var(--brand-dark)',
          900: '#064030',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          muted: 'var(--ink-muted)',
        },
        chalk: 'var(--chalk)',
        surface: 'var(--surface)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        extrabold: '800',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        brand: 'var(--shadow-brand)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-lg)',
        '3xl': 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      transitionTimingFunction: {
        'ease-out': 'var(--ease-out)',
      },
    },
  },
  plugins: [],
}
