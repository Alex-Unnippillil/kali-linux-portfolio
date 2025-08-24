export const PRESETS = [
  {
    label: 'Email',
    pattern: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b',
    mask(match, option) {
      const [user, domain] = match.split('@');
      if (option === 'partial') {
        return `${user[0]}***@${domain}`;
      }
      return '█'.repeat(user.length) + '@' + domain;
    },
  },
  {
    label: 'Phone',
    pattern: '\\b(?:\\+?\\d{1,3}[ -]?)?(?:\\d{3}[ -]?){2}\\d{4}\\b',
    mask(match, option) {
      if (option === 'partial') {
        return '***-***-' + match.slice(-4);
      }
      return '█'.repeat(match.length);
    },
  },
  {
    label: 'IP',
    pattern: '\\b(?:(?:\\d{1,3}\\.){3}\\d{1,3}|(?:[A-Fa-f0-9]{0,4}:){2,7}[A-Fa-f0-9]{0,4})\\b',
    mask(match, option) {
      if (option === 'partial') {
        if (match.includes('.')) {
          const parts = match.split('.');
          parts[parts.length - 1] = '***';
          return parts.join('.');
        }
        const parts = match.split(':');
        parts[parts.length - 1] = '****';
        return parts.join(':');
      }
      return '█'.repeat(match.length);
    },
  },
];

export default PRESETS;
