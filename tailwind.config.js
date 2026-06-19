/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        moka: {
          green: '#2D5016',
          gold: '#B8860B',
          light: '#EAF2E3',
          dark: '#1A3009',
          mid: '#4A5540',
          text: '#8A9E80',
          danger: '#C0392B',
          warning: '#E67E22',
          success: '#27AE60',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
