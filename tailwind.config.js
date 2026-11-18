/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        flash: { 50: '#fff8e6', 100: '#fff3d1', 400: '#ffc533', 500: '#f5a800', 600: '#d48c00', 700: '#a26a00' },
        encre: { 600: '#3b4252', 700: '#273149', 800: '#1a2236', 900: '#111827' },
        papier: '#f5f3ee', trait: '#e4e0d8', creme: '#ece8df', gris: '#7a808c',
        ok: { DEFAULT: '#1f7a4d', pale: '#e3f2e9' }, info: { DEFAULT: '#2d5bd0', pale: '#e6edfb' }, alerte: { DEFAULT: '#c2412d', pale: '#fbe9e5' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
