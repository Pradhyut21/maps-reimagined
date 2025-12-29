/** @type {import('tailwindcss').Config} */
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          50: '#f8f5f2',
          100: '#f1eae0',
          200: '#e3d5c0',
          300: '#d4bf9f',
          400: '#c5a97e',
          500: '#b6935d',
          600: '#8e764a',
          700: '#675838',
          800: '#3f3a2f',
          900: '#2a2621',
          950: '#1a1714',
          DEFAULT: '#3d2f2a',
        },
        'accent': {
          50: '#fef9e8',
          100: '#fdf1c5',
          200: '#fce38f',
          300: '#fad04e',
          400: '#f8bd24',
          500: '#e8b959',
          600: '#d99b1f',
          700: '#b47719',
          800: '#915c17',
          900: '#784c19',
          950: '#45270a',
        },
        'secondary': {
          DEFAULT: '#5a4a42',
          dark: '#3d2f2a',
          light: '#7a6a62',
        },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        display: ['Poppins', ...fontFamily.sans],
      },
      boxShadow: {
        'glow': '0 0 10px 2px rgba(232, 185, 89, 0.5)',
        'inner-glow': 'inset 0 0 10px 2px rgba(232, 185, 89, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}