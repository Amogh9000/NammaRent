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
        pageBg: '#F4F6FB',
        ink: {
          DEFAULT: '#0F172A',
          body: '#475569',
          light: '#64748B',
        },
        brandBlue: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#DBEAFE',
          tint: '#EFF6FF',
        },
        navy: {
          DEFAULT: '#0F172A',
          hover: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Bricolage Grotesque"', 'Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft-blue': '0 20px 60px rgba(37, 99, 235, 0.12)',
        'soft-card': '0 10px 40px rgba(15, 23, 42, 0.05)',
        'nav-pill': '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
