import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { marked } from 'marked';

const DOCS_ROOT = path.resolve('docs');
const OUTPUT_PATH = path.resolve('public/help-index.json');

marked.setOptions({
  mangle: false,
  headerIds: false,
});

const categoryHeuristics = [
  { pattern: /(task|checklist)/i, category: 'Tasks' },
  { pattern: /(test|plan|qa|keyboard|accessibility)/i, category: 'Testing' },
  { pattern: /(architecture|layout|dependency|module|internal|bare)/i, category: 'Architecture' },
  { pattern: /(nmap|recon|mitigation|hydra|hashcat|mimikatz|metasploit|volatility|forensic|deauth|wireshark|kismet|nessus|openvas|security|radare|autopsy)/i, category: 'Security' },
  { pattern: /(phaser|sprite|canvas|puzzle|maze|tower|game dev)/i, category: 'Games' },
  { pattern: /(reference|glossary|template)/i, category: 'Reference' },
  { pattern: /(guide|getting-started|overview|how-to)/i, category: 'Guides' },
  { pattern: /(accessibility|keyboard)/i, category: 'Accessibility' },
];

function extractTitle(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s+/, '').trim();
    }
  }
  return undefined;
}

function slugToTitle(slug) {
  const lastSegment = slug.split('/').pop() ?? slug;
  return lastSegment
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

function markdownToPlainText(markdown) {
  const html = marked.parse(markdown);
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExcerpt(text) {
  if (!text) return '';
  if (text.length <= 200) return text;
  const truncated = text.slice(0, 197);
  const lastSpace = truncated.lastIndexOf(' ');
  const snippet = lastSpace > 160 ? truncated.slice(0, lastSpace) : truncated;
  return `${snippet}…`;
}

function detectCategories(slug, title, text) {
  const normalizedSlug = slug.replace(/[_-]+/g, ' ');
  const haystack = `${normalizedSlug} ${title}`.toLowerCase();
  const snippet = text.toLowerCase().slice(0, 200);
  const detected = new Set();
  for (const { pattern, category } of categoryHeuristics) {
    if (pattern.test(haystack) || pattern.test(snippet)) {
      detected.add(category);
    }
  }
  if (detected.size === 0) {
    detected.add('Guides');
  }
  return Array.from(detected).sort((a, b) => a.localeCompare(b));
}

async function loadDocs() {
  const entries = await fg('**/*.md', { cwd: DOCS_ROOT, dot: false });
  const docs = [];

  for (const entry of entries) {
    const fullPath = path.join(DOCS_ROOT, entry);
    const markdown = await fs.readFile(fullPath, 'utf8');
    const slug = entry.replace(/\\/g, '/').replace(/\.md$/i, '');
    const title = extractTitle(markdown) ?? slugToTitle(slug);
    const plain = markdownToPlainText(markdown);
    const excerpt = buildExcerpt(plain);
    const categories = detectCategories(slug, title, plain.toLowerCase());

    docs.push({
      slug,
      title,
      categories,
      excerpt,
      markdown,
      searchText: plain.toLowerCase(),
    });
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

async function build() {
  try {
    const docs = await loadDocs();
    const payload = {
      generatedAt: new Date().toISOString(),
      docs,
    };

    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`Wrote help index with ${docs.length} documents to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  } catch (error) {
    console.error('Failed to build help index');
    console.error(error);
    process.exitCode = 1;
  }
}

build();
