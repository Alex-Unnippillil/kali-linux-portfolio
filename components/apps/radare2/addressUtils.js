export const parseAddress = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-f]+$/.test(normalized)) return null;
  return parseInt(normalized, 16);
};

export const formatAddress = (value) => {
  if (typeof value === 'string') {
    const parsed = parseAddress(value);
    return parsed === null ? null : `0x${parsed.toString(16)}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `0x${value.toString(16)}`;
  }
  return null;
};

export const normalizeAddress = (value) => formatAddress(value);
