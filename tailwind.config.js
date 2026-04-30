/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand verde CorrePool
        brand:         '#2FBF71',
        'brand-dark':  '#1E8E5A',
        'brand-light': '#E8F8F0',

        // Backgrounds camadas (light theme)
        base:     '#F5F7FA',
        surface:  '#FFFFFF',
        elevated: '#EEF1F5',
        hover:    '#E5EFFF',
        border:   '#E0E6ED',
        'border-light': '#D1D9E6',

        // Texto
        'text-bright':  '#1F2D3D',
        'text-primary': '#1F2D3D',
        'text-muted':   '#6B7C93',
        'text-dim':     '#A0AEC0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':    '0 4px 16px rgba(0,0,0,0.08)',
        'glow-brand': '0 0 20px rgba(47,191,113,0.3)',
        'glow-blue':  '0 0 20px rgba(59,130,246,0.25)',
        'glow-green': '0 0 20px rgba(47,191,113,0.25)',
      },
    },
  },
  plugins: [],
}
