const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{16,}/g,
  /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
  /secret\s*=\s*['"][^'"]+['"]/gi,
  /access[_-]?token\s*=\s*['"][^'"]+['"]/gi,
];

export const stripSecrets = (text: string): string =>
  SECRET_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[redacted]'), text);

export const copyToClipboard = async (text: string): Promise<boolean> => {
  const sanitized = stripSecrets(text);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(sanitized);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = sanitized;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    return true;
  } catch {
    return false;
  }
};

export default copyToClipboard;
export { stripSecrets };
