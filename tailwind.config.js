/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { // Ensure primary color is defined for form-checkbox
          DEFAULT: '#000000', // Your primary color
          50: '#f8f8f8',
          100: '#f0f0f0',
          200: '#e4e4e4',
          300: '#d1d1d1',
          400: '#b4b4b4',
          500: '#9a9a9a', // Used by focus:ring-primary-500
          600: '#818181', // Used by text-primary-600
          700: '#6a6a6a',
          800: '#4d4d4d',
          900: '#303030',
          950: '#1a1a1a',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // Add this line
  ],
}
