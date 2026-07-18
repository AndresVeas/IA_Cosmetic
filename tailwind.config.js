/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: '#FDFBF7',
          sand: '#F5EFEB',
          brown: '#8E7E73',
          black: '#1A1A1A',
        }
      },
      fontFamily: {
        serif: ['var(--font-display)'],
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        ui: ['var(--font-ui)'],
        metric: ['var(--font-metric)'],
      }
    },
  },
  plugins: [],
};
