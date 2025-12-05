/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#471212',
        panel: '#471212',
        border: '#D4524F',
        primary: '#4F46E5',
        accent: '#06B6D4',
        'text-dark': '#D4524F',
        'text-light': '#D4524F',
      },
      fontFamily: {
        heading: ['"Averia Serif Libre"', 'serif'],
        sans: ['"Averia Serif Libre"', 'serif'],
      },
    },
  },
  plugins: [],
};
