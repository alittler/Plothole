import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'slate': {
          950: '#030712',
        },
        'indigo': {
          600: '#4f46e5',
        },
        'emerald': {
          600: '#059669',
        },
      },
    },
  },
  plugins: [],
}

export default config
