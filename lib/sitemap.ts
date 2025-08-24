import { Readable } from 'node:stream';
import * as sax from 'sax';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  priority?: number;
  changefreq?: string;
}

export async function parseSitemap(stream: Readable): Promise<SitemapEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: SitemapEntry[] = [];
    let current: Partial<SitemapEntry> | null = null;
    let currentTag: string | null = null;

    const parser = sax.createStream(true, { lowercase: true });

    parser.on('error', (err) => reject(err));

    parser.on('opentag', (node) => {
      if (node.name === 'url') {
        current = {};
      } else if (current) {
        currentTag = node.name;
      }
    });

    parser.on('text', (text) => {
      if (!current || !currentTag) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      switch (currentTag) {
        case 'loc':
          current.loc = trimmed;
          break;
        case 'lastmod':
          current.lastmod = trimmed;
          break;
        case 'priority':
          current.priority = Number(trimmed);
          break;
        case 'changefreq':
          current.changefreq = trimmed;
          break;
        default:
          break;
      }
    });

    parser.on('closetag', (tagName) => {
      if (tagName === 'url') {
        if (current?.loc) entries.push(current as SitemapEntry);
        current = null;
      }
      currentTag = null;
    });

    parser.on('end', () => resolve(entries));

    stream.setEncoding('utf8');
    stream.pipe(parser);
  });
}
