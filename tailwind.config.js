/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#BFFF0B',
        'dark-green': '#1a2e1a',
        'darker-green': '#0f1f0f',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom, #1a2e1a, #000000)',
      },
    },
  },
  plugins: [],
}
