/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#0da6f2",
        "background-light": "#f5f7f8",
        "background-dark": "#101c22",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2c35",
        "border-light": "#e5e7eb",
        "border-dark": "#2d3748",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}