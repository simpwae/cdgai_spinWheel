
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        cdgai: {
          maroon: '#810B0B',
          dark: '#0A1628',
          surface: '#FFFFFF',
          surfaceAlt: '#F8FAFC',
          accent: '#2563EB',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          pending: '#7C3AED',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
