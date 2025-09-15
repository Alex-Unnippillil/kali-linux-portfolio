import { promises as fs } from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import { marked } from 'marked';

const docsDir = path.join(process.cwd(), 'docs');
const outFile = path.join(process.cwd(), 'data', 'docs-index.json');

const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const files = await fs.readdir(docsDir);

const documents = [];
for (const file of files) {
  if (!file.endsWith('.md')) continue;
  const content = await fs.readFile(path.join(docsDir, file), 'utf8');
  const tokens = marked.lexer(content);
  let current = null;
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (current) documents.push(current);
      const id = `${file}#${slug(token.text)}`;
      current = { id, title: token.text, content: '', url: `https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/${file}#${slug(token.text)}` };
    } else if (current && token.type === 'paragraph') {
      current.content += token.text + ' ';
    } else if (current && token.type === 'text') {
      current.content += token.text + ' ';
    }
  }
  if (current) documents.push(current);
}

const miniSearch = new MiniSearch({ fields: ['title', 'content'], storeFields: ['title', 'url', 'content'] });
miniSearch.addAll(documents);

const json = { index: miniSearch.toJSON() };
await fs.writeFile(outFile, JSON.stringify(json));
console.log(`Indexed ${documents.length} sections`);
