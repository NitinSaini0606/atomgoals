/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1f2933',
        muted: '#64748b',
        line: '#d8dee7',
        paper: '#f7f9fb',
        brand: '#215f5f',
        brandDark: '#174949',
        accent: '#b45309'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif']
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.05)'
      }
    }
  },
  plugins: []
};
