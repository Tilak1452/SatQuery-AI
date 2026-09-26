/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Primary accent gradient endpoints
        accent: {
          emerald: '#10B981',
          cyan: '#06B6D4',
          teal: '#14B8A6',
        },
        // Surface depth system (darkest → lightest)
        surface: {
          0: '#060A13',   // deepest background
          1: '#0B101E',   // primary surface (current bg)
          2: '#111827',   // elevated surface
          3: '#1A2332',   // cards / raised panels
        },
        // Geospatial-themed dark palette
        slate: {
          850: '#1a2332',
          950: '#0c1220',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.06) 37%, transparent 63%)',
        'accent-gradient': 'linear-gradient(135deg, #10B981, #06B6D4)',
        'accent-gradient-h': 'linear-gradient(90deg, #10B981, #06B6D4)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.15)',
        'glow-md': '0 0 20px rgba(16, 185, 129, 0.2), 0 0 40px rgba(6, 182, 212, 0.1)',
        'glow-lg': '0 0 30px rgba(16, 185, 129, 0.25), 0 0 60px rgba(6, 182, 212, 0.15)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'orbit': 'orbit 8s linear infinite',
        'orbit-reverse': 'orbit 12s linear infinite reverse',
        'orbit-slow': 'orbit 20s linear infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'spin-slow': 'spin 6s linear infinite',
        'typewriter-blink': 'typewriterBlink 1s step-end infinite',
        'stagger-in': 'staggerIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.1), 0 0 30px rgba(6, 182, 212, 0.05)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.25), 0 0 50px rgba(6, 182, 212, 0.15)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        typewriterBlink: {
          '0%, 100%': { borderColor: '#10B981' },
          '50%': { borderColor: 'transparent' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
