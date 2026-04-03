/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#06111d',
        surf: '#0b1726',
        surf2: '#0f1d30',
        brd: '#20354d',
        acc: '#33b5ff',
        acc2: '#7dd3fc',
        txt: '#e6f1fb',
        muted: '#88a3bb',
        grn: '#31d0aa',
        danger: '#ff5a67',
      },
      fontFamily: {
        mono: ['Share Tech Mono', 'monospace'],
        cond: ['Barlow Condensed', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
