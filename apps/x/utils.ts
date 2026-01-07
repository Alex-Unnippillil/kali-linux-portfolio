import DOMPurify from 'dompurify';

export const sanitizeHandle = (handle: string) =>
  DOMPurify.sanitize(handle).replace(/[^A-Za-z0-9_]/g, '').slice(0, 15);

export const sanitizeTweetText = (text: string) =>
  DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

export const formatTimestampInput = (timestamp: number) =>
  new Date(timestamp).toISOString().slice(0, 16);
