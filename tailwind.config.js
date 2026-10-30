/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#060505',
          DEFAULT: '#0A0908',
          900: '#0E0D0B',
          800: '#141210',
        },
        stone: {
          card: '#161412',
          cardHover: '#1C1916',
          surface: '#1F1B17',
          elevated: '#25211D',
        },
        border: {
          gold: '#2E2822',
          goldLight: '#433A31',
          goldActive: '#7A6443',
        },
        terracotta: {
          DEFAULT: '#D95338',
          hover: '#E26349',
          light: '#F87154',
          dark: '#B83F27',
          glow: 'rgba(217, 83, 56, 0.35)',
        },
        gold: {
          DEFAULT: '#D4A359',
          light: '#E2B878',
          amber: '#F59E0B',
          muted: '#9E7A43',
          glow: 'rgba(212, 163, 89, 0.35)',
        },
        sand: {
          subtext: '#E5DDD0',
          muted: '#C4B9A7',
          dark: '#9E9484',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'row-flash': {
          '0%': { backgroundColor: 'rgba(212, 163, 89, 0.45)', boxShadow: '0 0 25px rgba(212, 163, 89, 0.6)' },
          '50%': { backgroundColor: 'rgba(217, 83, 56, 0.25)', boxShadow: '0 0 15px rgba(217, 83, 56, 0.4)' },
          '100%': { backgroundColor: 'transparent', boxShadow: 'none' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'row-flash': 'row-flash 2.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulse-glow 2.5s infinite ease-in-out',
        'shimmer': 'shimmer 3s infinite linear'
      }
    },
  },
  plugins: [],
}
