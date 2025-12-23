/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        brand: {
          red: '#D32F2F',
          blue: '#1976D2',
          dark: '#1F2937',
          gray: '#F3F4F6'
        }
      }
    },
  },
  plugins: [],
}