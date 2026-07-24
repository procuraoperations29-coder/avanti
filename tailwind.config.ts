import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Avanti Tailwind config.
 *
 * Colours resolve from CSS variables in globals.css so the whole app can
 * be re-themed by changing variable values, not rewriting classes. One
 * palette (navy/green, from the Avanti logo) serves the entire app —
 * there used to be a second `admin` namespace scoped to the dashboard,
 * but it's been folded into the base tokens below.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        paper: {
          DEFAULT: 'var(--paper)',
          2: 'var(--paper-2)',
          3: 'var(--paper-3)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        brass: {
          DEFAULT: 'var(--brass)',
          soft: 'var(--brass-soft)',
        },
        green: {
          DEFAULT: 'var(--green)',
          soft: 'var(--green-soft)',
        },
        oxblood: {
          DEFAULT: 'var(--oxblood)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        tier: {
          1: 'var(--tier-1)',
          2: 'var(--tier-2)',
          3: 'var(--tier-3)',
          4: 'var(--tier-4)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 240ms ease-out',
        'slide-up': 'slide-up 280ms ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
