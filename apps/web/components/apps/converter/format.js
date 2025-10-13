export const formatBytes = (bytes, decimals = 2) => {
  if (!Number.isFinite(bytes)) return '0 B';
  const sign = bytes < 0 ? '-' : '';
  const abs = Math.abs(bytes);
  if (abs === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(abs) / Math.log(k));
  const value = abs / Math.pow(k, i);
  const num = parseFloat(value.toFixed(decimals));
  return `${sign}${num} ${units[i]}`;
};

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '0s';
  const sign = seconds < 0 ? '-' : '';
  let remaining = Math.abs(seconds);
  const units = [
    { label: 'h', value: 3600 },
    { label: 'm', value: 60 },
    { label: 's', value: 1 },
  ];
  const parts = [];
  for (const { label, value } of units) {
    if (remaining >= value || (label === 's' && parts.length === 0)) {
      const amount = Math.floor(remaining / value);
      remaining %= value;
      parts.push(`${amount}${label}`);
    }
  }
  return sign + parts.join(' ');
};
