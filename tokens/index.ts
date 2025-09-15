export default {
  space: {
    1: { value: '0.25rem' },
    2: { value: '0.5rem' },
    3: { value: '0.75rem' },
    4: { value: '1rem' },
    5: { value: '1.5rem' },
    6: { value: '2rem' },
  },
  radius: {
    sm: { value: '2px' },
    md: { value: '4px' },
    lg: { value: '8px' },
    round: { value: '9999px' },
  },
  'z-index': {
    base: { value: 0 },
    dropdown: { value: 1000 },
    overlay: { value: 2000 },
    modal: { value: 3000 },
  },
  motion: {
    fast: { value: '150ms' },
    medium: { value: '300ms' },
    slow: { value: '500ms' },
  },
} as const;
