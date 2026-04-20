/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark:    '#0a0a0a',
        primary: '#3b82f6',
        accent:  '#8b5cf6',
        glass:   'rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'blob':  'blob 7s infinite',
        'float': 'float 6s ease-in-out infinite',
        'shine': 'shine 1.5s ease-out infinite',
      },
      keyframes: {
        blob: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)'          },
          '33%':  { transform: 'translate(30px, -50px) scale(1.1)'     },
          '66%':  { transform: 'translate(-20px, 20px) scale(0.9)'     },
          '100%': { transform: 'translate(0px, 0px) scale(1)'          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)'    },
          '50%':      { transform: 'translateY(-20px)' },
        },
        shine: {
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [],
}
