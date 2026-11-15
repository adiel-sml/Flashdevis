/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        flash: { 50: '#fff8e6', 100: '#ffefc2', 400: '#ffc533', 500: '#f5a800', 600: '#d48c00' },
        encre: { 700: '#273149', 800: '#1a2236', 900: '#111827' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
