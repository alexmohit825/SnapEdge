/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
        },
        slate: {
          850: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        orange: {
          500: '#FF4800', // International Safety / McLaren Orange
          600: '#E03E00',
        },
        racing: {
          500: '#059669', // Alpine / British Racing Green
          600: '#047857',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'swiss': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 8px 24px -4px rgba(15, 23, 42, 0.06)',
        'swiss-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 16px 32px -4px rgba(15, 23, 42, 0.10)',
        'orange-glow': '0 4px 20px rgba(255, 72, 0, 0.25)',
      }
    },
  },
  plugins: [],
}
