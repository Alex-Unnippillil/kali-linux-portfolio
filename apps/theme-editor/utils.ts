export const normalizeHex = (value: string): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
};

export const fallbackCopy = (text: string): boolean => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.error('Copy fallback failed', error);
    return false;
  }
};

export const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-{2,}/g, '-');
};

export const formatCssVariables = (
  scope: string,
  values: Record<string, string>,
): string => {
  const lines = Object.entries(values)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `${scope} {\n${lines}\n}`;
};
