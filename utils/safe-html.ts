import type { Config } from 'dompurify';
import DOMPurify from 'dompurify';

export type SafeHtmlOptions = Config;

export function safeHTML(html: string | null | undefined, options?: SafeHtmlOptions): string {
  if (!html) {
    return '';
  }

  return DOMPurify.sanitize(html, options);
}

export { DOMPurify };
