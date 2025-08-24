export interface ScanResult {
  tag: string;
  attr: string;
  url: string;
  httpsUrl: string;
}

self.onmessage = (e: MessageEvent<string>) => {
  const html = e.data;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = Array.from(doc.querySelectorAll('[src],[href]'));
  const results: ScanResult[] = [];

  elements.forEach((el) => {
    const attr = el.getAttribute('src') ? 'src' : 'href';
    const url = el.getAttribute(attr);
    if (url && url.startsWith('http://')) {
      results.push({
        tag: el.tagName.toLowerCase(),
        attr,
        url,
        httpsUrl: url.replace(/^http:\/\//i, 'https://'),
      });
    }
  });

  (self as any).postMessage(results);
};

export {};

