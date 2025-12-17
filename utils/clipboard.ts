import { stripDangerousText } from './sanitizeText';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const safeText = stripDangerousText(text);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(safeText);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = safeText;
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
