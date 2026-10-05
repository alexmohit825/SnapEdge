/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#070A10',
          900: '#0B0F17',
          850: '#101622',
          800: '#151E2E',
          700: '#222F46',
        },
        emerald: {
          400: '#00F5A0',
          500: '#00D68B',
        },
        cyan: {
          400: '#00D2FF',
          500: '#00B4DB',
        },
        amber: {
          400: '#FFB800',
        },
        rose: {
          400: '#FF3366',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
