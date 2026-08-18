/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        eco: {
          green: '#22c55e',
          blue: '#38bdf8',
          earth: '#a16207',
        },
      },
      boxShadow: {
        card: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}


