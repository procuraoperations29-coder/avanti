import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * Avanti Tailwind config.
 *
 * Colours resolve from CSS variables in globals.css so light/dark modes
 * can swap by changing variables — not rewriting classes.
 *
 * The `admin` namespace below is a second, additive palette for the
 * fintech-style admin dashboard redesign (see globals.css). It doesn't
 * replace or touch paper/ink/brass — those keep serving the rest of the
 * app exactly as before.
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
        admin: {
          navy: 'var(--admin-navy)',
          'navy-2': 'var(--admin-navy-2)',
          'navy-soft': 'var(--admin-navy-soft)',
          'nav-text': 'var(--admin-nav-text)',
          bg: 'var(--admin-bg)',
          card: 'var(--admin-card)',
          border: 'var(--admin-border)',
          text: 'var(--admin-text)',
          'text-muted': 'var(--admin-text-muted)',
          green: 'var(--admin-green)',
          'green-soft': 'var(--admin-green-soft)',
          'green-text': 'var(--admin-green-text)',
          amber: 'var(--admin-amber)',
          'amber-soft': 'var(--admin-amber-soft)',
          'amber-text': 'var(--admin-amber-text)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
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
