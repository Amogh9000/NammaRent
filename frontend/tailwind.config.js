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
        background: '#0A0A0A',
        surface: '#121212',
        surfaceElevated: '#1A1A1A',
        surfaceBorder: '#262626',
        textPrimary: '#F5F5F7',
        textSecondary: '#86868B',
        accentEmerald: '#10B981',
        accentAmber: '#F59E0B',
        accentIndigo: '#6366F1',
        accentRose: '#F43F5E',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'subtle-glow': '0 0 40px -10px rgba(16, 185, 129, 0.15)',
        'amber-glow': '0 0 40px -10px rgba(245, 158, 11, 0.2)',
        'paper': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
