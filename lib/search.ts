import fs from 'fs';
import path from 'path';
import { Document } from 'flexsearch';

export interface SearchDoc {
  id: string;
  title: string;
  url: string;
  section: 'docs' | 'tools' | 'platforms';
}

let index: Document<SearchDoc> | null = null;

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

  // Docs headings
  const docsDir = path.join(process.cwd(), 'public', 'docs', 'seed');
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const topic = file.replace(/\.md$/, '');
      const md = fs.readFileSync(path.join(docsDir, file), 'utf8');
      const headingRegex = /^#{2,3}\s+(.*)$/gm;
      let m: RegExpExecArray | null;
      while ((m = headingRegex.exec(md)) !== null) {
        const text = m[1].trim();
        const slug = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        idx.add({
          id: `doc-${topic}#${slug}`,
          title: text,
          url: `/docs/${topic}#${slug}`,
          section: 'docs',
        });
      }
    }
  }

  // Tool names
  const toolsPath = path.join(process.cwd(), 'data', 'kali-tools.json');
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

  // Platform slugs from apps.config
  try {
    const apps = (await import(path.join(process.cwd(), 'apps.config.js'))).default as any[];
    for (const app of apps) {
      idx.add({
        id: `app-${app.id}`,
        title: app.title,
        url: `/apps/${app.id}`,
        section: 'platforms',
      });
    }
  } catch {
    // ignore if apps.config not available
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
