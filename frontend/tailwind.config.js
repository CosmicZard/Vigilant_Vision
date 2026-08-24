/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          blue: '#0284c7',       // Sky/Ocean Blue
          'blue-light': '#e0f2fe', // Soft pastel blue
          'blue-subtle': '#f0f9ff',
          green: '#059669',      // Fresh Emerald Green
          'green-light': '#d1fae5', // Soft pastel green
          'green-subtle': '#ecfdf5',
        }
      }
    },
  },
  plugins: [],
}
