export interface ScanResult {
  tag: string;
  attr: string;
  url: string;
  httpsUrl: string;
  category: 'active' | 'passive';
}

self.onmessage = (e: MessageEvent<string>) => {
  const html = e.data;
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
      results.push({
        tag,
        attr,
        url,
        httpsUrl: url.replace(/^http:\/\//i, 'https://'),
        category,
      });
    }
  });

  (self as any).postMessage(results);
};

export {};

