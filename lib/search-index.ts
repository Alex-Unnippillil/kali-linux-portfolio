import fs from 'fs';
import path from 'path';
import { Document } from 'flexsearch';

export interface SearchDoc {
  id: string;
  title: string;
  url: string;
  section: 'content' | 'tools';
}

let index: Document<SearchDoc> | null = null;

function indexContent(dir: string, idx: Document<SearchDoc>, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      indexContent(full, idx, rel);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.mdx')) {
        const mdx = fs.readFileSync(full, 'utf8');
        const m = mdx.match(/export const title\s*=\s*['"]([^'"]+)['"]/);
        const title = m ? m[1] : entry.name.replace(/\.mdx$/, '');
        const slug = '/' + rel.replace(/\.mdx$/, '').split(path.sep).join('/');
        idx.add({
          id: `content-${slug}`,
          title,
          url: slug,
          section: 'content',
        });
      } else if (entry.name.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(full, 'utf8'));
          const slug = '/' + rel.replace(/\.json$/, '').split(path.sep).join('/');
          if (Array.isArray(data)) {
            for (const item of data) {
              const title = item.title || item.name;
              if (title) {
                idx.add({
                  id: `content-${slug}-${title}`,
                  title,
                  url: slug,
                  section: 'content',
                });
              }
            }
          } else {
            const title = data.title || data.name;
            if (title) {
              idx.add({
                id: `content-${slug}`,
                title,
                url: slug,
                section: 'content',
              });
            }
          }
        } catch {
          // ignore invalid json
        }
      }
    }
  }
}

async function buildIndex() {
  const idx = new Document<SearchDoc>({
    document: {
      id: 'id',
      index: ['title'],
      tag: 'section',
      store: ['title', 'url', 'section'],
    },
    tokenize: 'forward',
    cache: 100,
  });

  const contentDir = path.join(process.cwd(), 'content');
  if (fs.existsSync(contentDir)) {
    indexContent(contentDir, idx);
  }

  const toolsPath = path.join(process.cwd(), 'data', 'tools.json');
  if (fs.existsSync(toolsPath)) {
    const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8')) as { id: string; name: string }[];
    for (const tool of tools) {
      idx.add({
        id: `tool-${tool.id}`,
        title: tool.name,
        url: `https://www.kali.org/tools/${tool.id}/`,
        section: 'tools',
      });
    }
  }

  index = idx;
  return idx;
}

export async function getSearchIndex() {
  return index || buildIndex();
}

export async function searchAll(query: string) {
  const idx = await getSearchIndex();
  const results = idx.search(query, { enrich: true }) as any[];
  const docs: SearchDoc[] = [];
  for (const result of results) {
    for (const r of result.result) {
      if (r.doc) docs.push(r.doc as SearchDoc);
    }
  }
  return docs;
}
