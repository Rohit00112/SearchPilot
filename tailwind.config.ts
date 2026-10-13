import type { Config } from 'tailwindcss';

/** Semantic SearchPilot names map to replica/design/tokens.css. */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--sp-bg)',
        surface: 'var(--sp-surface)',
        'surface-muted': 'var(--sp-surface-muted)',
        border: 'var(--sp-border)',
        'border-input': 'var(--sp-border-input)',
        ink: 'var(--sp-text)',
        muted: 'var(--sp-text-muted)',
        accent: 'var(--sp-accent)',
        'on-accent': 'var(--sp-on-accent)',
        'accent-subtle': 'var(--sp-accent-subtle)',
        danger: 'var(--sp-danger)',
        success: 'var(--sp-success)',
        warning: 'var(--sp-warning)',
        focus: 'var(--sp-focus)',
      },
      borderRadius: { sm: 'var(--sp-radius-sm)', md: 'var(--sp-radius-md)', lg: 'var(--sp-radius-lg)', xl: 'var(--sp-radius-xl)' },
      boxShadow: { soft: 'var(--sp-shadow-sm)', raised: 'var(--sp-shadow-md)' },
      maxWidth: { content: '1480px' },
    },
  },
  plugins: [],
} satisfies Config;
