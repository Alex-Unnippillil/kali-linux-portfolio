export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
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
