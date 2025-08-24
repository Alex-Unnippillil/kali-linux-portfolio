export interface ScanResult {
  tag: string;
  attr: string;
  url: string;
  httpsUrl: string;
  category: 'active' | 'passive';
  suggestion: string;
}

export function scan(html: string): ScanResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = Array.from(doc.querySelectorAll('[src],[href]'));
  const results: ScanResult[] = [];

  const activeTags = new Set(['script', 'iframe', 'embed', 'object', 'link', 'form']);

  elements.forEach((el) => {
    const attr = el.getAttribute('src') ? 'src' : 'href';
    const url = el.getAttribute(attr);
    if (url && url.startsWith('http://')) {
      const tag = el.tagName.toLowerCase();
      let category: 'active' | 'passive' = 'passive';
      if (
        activeTags.has(tag) ||
        (tag === 'link' && (el as HTMLLinkElement).rel === 'stylesheet')
      ) {
        category = 'active';
      }
      const httpsUrl = url.replace(/^http:\/\//i, 'https://');
      let suggestion = `Replace with ${httpsUrl}`;
      if (category === 'active') {
        suggestion += ' or remove the insecure element';
      }
      results.push({
        tag,
        attr,
        url,
        httpsUrl,
        category,
        suggestion,
      });
    }
  });

  return results;
}

self.onmessage = (e: MessageEvent<string>) => {
  const results = scan(e.data);
  (self as any).postMessage(results);
};

export {};

