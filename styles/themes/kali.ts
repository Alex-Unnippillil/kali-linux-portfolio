export const kaliTheme = {
  background: 'var(--color-bg)',
  text: 'var(--color-text)',
  accent: 'var(--color-primary)',
  sidebar: 'var(--color-secondary)',
  bubble: {
    background: 'var(--toast-bg)',
    text: 'var(--toast-text)',
    border: 'var(--toast-border)',
  },
  purple: {
    button: 'var(--purple-button)',
    link: 'var(--purple-link)',
    badge: {
      background: 'var(--purple-badge-bg)',
      text: 'var(--purple-badge-text)',
    },
  },
};

export type KaliTheme = typeof kaliTheme;
