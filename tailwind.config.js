/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f2f9',
          100: '#cce5f3',
          200: '#99cbe7',
          300: '#66b1db',
          400: '#4d9fce',
          500: '#337ab7', // Color corporativo iGlobal
          600: '#2d6ba3',
          700: '#265c8f',
          800: '#204d7b',
          900: '#1a3e67',
        },
        iglobal: '#337ab7' // Acceso directo al color corporativo
      }
    },
  },
  plugins: [],
}
