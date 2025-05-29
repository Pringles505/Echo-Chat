/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef2ff',   // very light blue
          100: '#e0e7ff',  // lighter blue
          200: '#c7d2fe',  // light blue
          300: '#a5b4fc',  // soft blue
          400: '#818cf8',  // medium blue
          500: '#6366f1',  // base blue (primary)
          600: '#4f46e5',  // deep blue
          700: '#4338ca',  // darker blue
          800: '#3730a3',  // very dark blue
          900: '#312e81',  // almost navy
          950: '#1e1b4b',  // nearly black-blue
        },
      },
    },
  },
  plugins: [],
};
