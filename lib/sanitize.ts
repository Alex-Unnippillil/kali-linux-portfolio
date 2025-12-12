import DOMPurify, { type Config } from 'dompurify';

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};


export const escapeHtml = (input = ''): string =>
  input.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);

const baseConfig: Config = {
  USE_PROFILES: { html: true },
};

const anchorHook = (node: Element) => {
  if (node.tagName !== 'A') return;
  node.setAttribute('target', '_blank');
  const existingRel = node.getAttribute('rel') || '';
  const rel = new Set(existingRel.split(/\s+/).filter(Boolean));
  rel.add('noopener');
  rel.add('noreferrer');
  node.setAttribute('rel', Array.from(rel).join(' '));
};

// Always add the anchorHook before sanitizing. DOMPurify allows duplicate hooks,
// but our hook is idempotent, so this is safe.
export const ensureAnchorTargetHook = () => {
  if (typeof window === 'undefined' || !DOMPurify.isSupported) return;
  DOMPurify.addHook('afterSanitizeAttributes', anchorHook);
};

export const sanitizeHtml = (dirty = '', config?: Config) => {
  if (!dirty) return '';
  if (typeof window === 'undefined' || !DOMPurify.isSupported) {
    return escapeHtml(dirty);
  }
  ensureAnchorTargetHook();
  return DOMPurify.sanitize(dirty, { ...baseConfig, ...config });
};

export default sanitizeHtml;
