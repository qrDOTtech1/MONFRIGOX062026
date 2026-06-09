import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0f0d',
          800: '#111916',
          700: '#1a2520',
          600: '#223129',
          500: '#2a3d33',
        },
        fresh: {
          50: '#edfcf2',
          100: '#d4f7e0',
          200: '#acedc5',
          300: '#75dea2',
          400: '#3dcb7a',
          500: '#22c55e',
          600: '#0fa14a',
          700: '#0d813d',
          800: '#0e6633',
          900: '#0c542b',
        },
        cream: '#f5f0e8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
