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
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          2: 'rgb(var(--paper-2) / <alpha-value>)',
          3: 'rgb(var(--paper-3) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        brass: {
          DEFAULT: 'rgb(var(--brass) / <alpha-value>)',
          soft: 'rgb(var(--brass-soft) / <alpha-value>)',
          text: 'rgb(var(--brass-text) / <alpha-value>)',
        },
        green: {
          DEFAULT: 'rgb(var(--green) / <alpha-value>)',
          soft: 'rgb(var(--green-soft) / <alpha-value>)',
          text: 'rgb(var(--green-text) / <alpha-value>)',
        },
        oxblood: {
          DEFAULT: 'rgb(var(--oxblood) / <alpha-value>)',
          soft: 'rgb(var(--oxblood-soft) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        tier: {
          1: 'rgb(var(--tier-1) / <alpha-value>)',
          2: 'rgb(var(--tier-2) / <alpha-value>)',
          3: 'rgb(var(--tier-3) / <alpha-value>)',
          4: 'rgb(var(--tier-4) / <alpha-value>)',
        },

        /*
         * Admin console skin — semantic tokens for /admin only (see the
         * `--admin-*` block in globals.css). Light + dark are handled by the
         * CSS variables, so these utilities work in both themes unchanged.
         */
        admin: {
          bg: 'rgb(var(--admin-bg) / <alpha-value>)',
          card: 'rgb(var(--admin-card) / <alpha-value>)',
          border: 'rgb(var(--admin-border) / <alpha-value>)',
          text: {
            DEFAULT: 'rgb(var(--admin-text) / <alpha-value>)',
            muted: 'rgb(var(--admin-text-muted) / <alpha-value>)',
          },
          navy: {
            DEFAULT: 'rgb(var(--admin-navy) / <alpha-value>)',
            2: 'rgb(var(--admin-navy-2) / <alpha-value>)',
            soft: 'rgb(var(--admin-navy-soft) / <alpha-value>)',
          },
          nav: {
            text: 'rgb(var(--admin-nav-text) / <alpha-value>)',
          },
          green: {
            DEFAULT: 'rgb(var(--admin-green) / <alpha-value>)',
            soft: 'rgb(var(--admin-green-soft) / <alpha-value>)',
            text: 'rgb(var(--admin-green-text) / <alpha-value>)',
          },
          amber: {
            DEFAULT: 'rgb(var(--admin-amber) / <alpha-value>)',
            soft: 'rgb(var(--admin-amber-soft) / <alpha-value>)',
            text: 'rgb(var(--admin-amber-text) / <alpha-value>)',
          },
        },
      },
      boxShadow: {
        'admin-sm': 'var(--admin-shadow-sm)',
        admin: 'var(--admin-shadow)',
        'admin-lg': 'var(--admin-shadow-lg)',
        'admin-glow': 'var(--admin-glow)',
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
