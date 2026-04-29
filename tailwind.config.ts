import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        brand: {
          bg:       '#080C18',
          surface:  '#0D1525',
          elevated: '#111E33',
          border:   '#1E2A42',
          muted:    '#162035',
          accent:   '#3B82F6',
          dim:      '#1D4ED8',
        },
        kpi: {
          success: '#10B981',
          warning: '#F59E0B',
          danger:  '#EF4444',
          live:    '#EF4444',
        },
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.5)',
      },
    },
  },
  plugins: [],
}
export default config
